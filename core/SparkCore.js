const EventEmitter = require('events');
const WebManager = require('./WebManager');
const PluginManager = require('./PluginManager');
const path = require('path');
const fs = require('fs');

class SparkCore extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;

        // 【核心修改】废弃单体 this.adapter，改为双轨适配器数组
        this.botAdapters = [];
        this.serverAdapters = [];

        this.sharedEnv = {}; // 核心维护的共享状态池

        // 读取 package.json 获取版本号
        const pkgPath = path.join(__dirname, '../package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

        // 将版本号加载到变量池
        this.sharedEnv['version'] = pkg.version;

        this.webManager = new WebManager(this, config.server_port);
        this.pluginManager = new PluginManager(this);
    }

    // ==========================================
    // 新增：挂载机器人适配器
    // ==========================================
    useBotAdapter(adapter) {
        this.botAdapters.push(adapter);
        // 将适配器接收到的消息，转发到 Core 的事件总线
        adapter.on('gocq.pack', (msg) => this.emit('gocq.pack', msg));
        // 如果有通用消息事件也可以一并抛出
        adapter.on('message', (msg) => this.emit('message', msg));
    }

    // ==========================================
    // 新增：挂载服务端(MC)适配器
    // ==========================================
    useServerAdapter(adapter) {
        this.serverAdapters.push(adapter);
        // 将服务器端的事件透传到总线，带上 serverId 方便插件区分
        adapter.on('server.message', (serverId, data) => this.emit('server.message', serverId, data));
        adapter.on('server.connected', (serverId) => this.emit('server.connected', serverId));
        adapter.on('server.disconnected', (serverId) => this.emit('server.disconnected', serverId));
    }

    // ==========================================
    // 启动核心逻辑
    // ==========================================
    async start() {
        this.webManager.start();

        // 依次启动所有机器人适配器
        for (const adp of this.botAdapters) {
            if (adp.connect) await adp.connect();
        }

        // 依次启动所有服务器适配器
        for (const adp of this.serverAdapters) {
            if (adp.connect) await adp.connect();
        }

        this.pluginManager.loadAll();
    }

    // ==========================================
    // 兼容层与全局变量池
    // ==========================================
    getLegacyAPI(pluginName = 'unknown', folder = 'unknown') {
        if (SparkCore.debug)
             console.log(`[${pluginName}] 兼容层已启动`);
        const self = this;
        const legacyApi = {
            onBDS: typeof mc !== 'undefined',
            debug: this.config.debug,
            VERSION: this.sharedEnv['version'] || '3.0.0', // 动态读取真实版本
            pluginName,

            env: {
                get: (key) => self.sharedEnv[key],
                set: (key, val) => {
                    self.sharedEnv[key] = val;
                    self.emit(`env.update.${key}`, val);
                    self.emit('env.update', key, val);
                }
            },

            msgbuilder: require('../handles/msgbuilder'),
            packbuilder: require('../handles/packbuilder'),
            parseCQString: require('../handles/parserCQString'),

            // 【向下兼容】旧插件可能直接通过 spark.QClient 调用发消息
            // 这里默认取第一个机器人适配器作为主适配器
            QClient: this.botAdapters.length > 0 ? this.botAdapters[0] : null,

            on: (eventName, cb) => {
                if (eventName === 'event.telemetry.ready') self.on('core.ready', cb);
                else self.on(eventName, cb);
            },
            emit: (eventName, ...args) => {
                if (eventName === 'event.telemetry.pushconfig') {
                    const webConfigBuilder = args[0];
                    self.webManager.registerConfig(webConfigBuilder);
                } else {
                    self.emit(eventName, ...args);
                }
            },

            web: {
                createConfig: (customName) => {
                    const actualName = customName || pluginName;
                    const schema = { name: actualName, items: [] };
                    const builder = {
                        text: (key, val, desc) => { schema.items.push({ type: 'text', key, val, desc }); return builder; },
                        number: (key, val, desc) => { schema.items.push({ type: 'number', key, val, desc }); return builder; },
                        switch: (key, val, desc) => { schema.items.push({ type: 'switch', key, val, desc }); return builder; },
                        select: (key, options, val, desc) => { schema.items.push({ type: 'choose', key, options, val, desc }); return builder; },
                        array: (key, val, desc) => { schema.items.push({ type: 'editArray', key, val, desc }); return builder; },
                        register: () => self.webManager.registerConfig(schema)
                    };
                    return builder;
                },
                registerApi: (method, path, handler, needAuth = true) => {
                    self.webManager.registerApi(method, path, handler, needAuth);
                },
                registerConfig: (configBuilder) => {
                    self.webManager.registerConfig(configBuilder);
                },
                registerPage: (title, relativePath) => {
                    // 传入 folder 解决前端静态资源路由 404 问题
                    self.webManager.registerCustomPage(pluginName, folder, title, relativePath);
                }
            },

            telemetry: {
                WebConfigBuilder: class {
                    constructor(name) {
                        this.schema = { name, items: [] };
                    }
                    addText(key, val, desc) { this.schema.items.push({ type: 'text', key, val, desc }); }
                    addNumber(key, val, desc) { this.schema.items.push({ type: 'number', key, val, desc }); }
                    addChoosing(key, options, val, desc) { this.schema.items.push({ type: 'choose', key, options, val, desc }); }
                    addSwitch(key, val, desc) { this.schema.items.push({ type: 'switch', key, val, desc }); }
                    addEditArray(key, arr, desc) { this.schema.items.push({ type: 'editArray', key, arr, desc }); }
                    register() { self.webManager.registerConfig(this.schema) }
                }
            },
            hub: {
                isActive: () => !spark.onBDS && self.serverAdapters.length > 0,

                // 【新增 API】动态添加节点
                addServerNode: (serverId, url, password) => {
                    console.log(`\n[调试] API收到了请求，准备添加节点: ${serverId}`);

                    // 打印当前到底加载了什么适配器
                    console.log(`[调试] 当前挂载的适配器有:`, self.serverAdapters.map(a => a.adapterName));

                    // 寻找适配器 (如果你用的是找名字的方法)
                    const adapter = self.serverAdapters.find(adp => adp.adapterName === 'WSClients');

                    // 如果你用的是取第一个的方法，就改成 const adapter = self.serverAdapters[0];

                    if (!adapter) {
                        console.log('[调试] ❌ 找不到指定的适配器！');
                        return;
                    }

                    if (!adapter.addServer) {
                        console.log('[调试] ❌ 找到了适配器，但它里面没有 addServer 这个方法！');
                        return;
                    }

                    console.log('[调试] ✅ 成功移交给适配器执行...');
                    adapter.addServer(serverId, url, password);
                },

                // 【新增 API】动态移除节点
                removeServerNode: (serverId) => {
                    const adapter = self.serverAdapters[0];
                    if (adapter && adapter.removeServer) {
                        adapter.removeServer(serverId);
                    }
                },

                // 【新增 API】获取连接池状态
                getNodeStatus: (serverId) => {
                    const adapter = self.serverAdapters[0];
                    if (!adapter || !adapter.clients) return 'offline';
                    const ws = adapter.clients.get(serverId);
                    return (ws && ws.readyState === 1) ? 'online' : 'offline';
                },

                /**
                 * 获取当前所有在线的子服 ID 列表
                 * @returns {string[]} 例如 ['Lobby', 'Survival', 'Bedwar']
                 */
                getOnlineServers: () => {
                    if (self.serverAdapters.length === 0) return [];
                    const adapter = self.serverAdapters[0];
                    if (adapter.clients) {
                        return Array.from(adapter.clients.keys());
                    }
                    return [];
                },

                /**
                 * 向指定服务器发送指令包
                 * @param {string} serverId 目标服务器ID
                 * @param {string} cmd 指令内容
                 * @returns {boolean} 是否成功下发
                 */
                sendCommand: (serverId, cmd) => {
                    if (self.serverAdapters.length === 0) return false;
                    return self.serverAdapters[0].sendCommand(serverId, cmd);
                },

                /**
                 * 向所有在线子服广播指令
                 * @param {string} cmd 指令内容
                 */
                broadcast: (cmd) => {
                    if (self.serverAdapters.length > 0) {
                        self.serverAdapters[0].broadcast(cmd);
                    }
                }
            },
            getFileHelper: (pl_name) => { return new (require('../handles/file')).FileObj(pl_name) },
            getLogger: () => require('../handles/logger').getLogger(pluginName)
        };
        return legacyApi;
    }
}

module.exports = SparkCore;