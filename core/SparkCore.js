const EventEmitter = require('events');
const WebManager = require('./WebManager');
const PluginManager = require('./PluginManager');
const path = require('path');
const fs = require('fs');
// const { getLogger } = require('../handles/logger');

class SparkCore extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.adapter = null;
        this.sharedEnv = {}; // 核心维护的共享状态池

        // 读取 package.json 获取版本号
        const pkgPath = path.join(__dirname, '../package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

        // 将版本号加载到变量池
        this.sharedEnv['version'] = pkg.version;

        // 【修复点】传入 this 作为 core 实例，传入端口作为第二个参数
        this.webManager = new WebManager(this, config.server_port);
        this.pluginManager = new PluginManager(this);
    }

    useAdapter(adapter) {
        this.adapter = adapter;
        // 将适配器接收到的消息，转发到 Core 的事件总线
        this.adapter.on('gocq.pack', (msg) => this.emit('gocq.pack', msg));
        // this.adapter.on('message', (msg) => this.emit('message', msg));
    }

    async start() {
        this.webManager.start();
        if (this.adapter) await this.adapter.connect();
        this.pluginManager.loadAll();
    }

    // 兼容层与全局变量池
    getLegacyAPI(pluginName = 'unknown') {
        const self = this;
        const legacyApi = {
            onBDS: typeof mc !== 'undefined',
            debug: this.config.debug,
            VERSION: '3.0.0',

            // 新版环境变量池
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
            QClient: this.adapter,

            // 桥接事件监听
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

            // 暴露 Web 脚手架接口
            web: {
                createConfig: (pluginName) => {
                    // console.log(`[${pluginName}] 创建配置项`);
                    const schema = { name: pluginName, items: [] };
                    const builder = {
                        text: (key, val, desc) => { schema.items.push({ type: 'text', key, val, desc }); return builder; },
                        number: (key, val, desc) => { schema.items.push({ type: 'number', key, val, desc }); return builder; },
                        switch: (key, val, desc) => { schema.items.push({ type: 'switch', key, val, desc }); return builder; },
                        select: (key, options, val, desc) => { schema.items.push({ type: 'choose', key, options, val, desc }); return builder; },
                        array: (key,  val, desc) => { schema.items.push({ type: 'editArray', key,  val, desc }); return builder; },
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
                    // 这里的 pluginName 需要从 PluginManager 传入上下文时确定
                    self.webManager.registerCustomPage(pluginName, title, relativePath);
                }
            },

            telemetry: {
                WebConfigBuilder: class {
                    constructor(name) { this.name = name; this.items = []; }
                    addText(key, val, desc) { this.items.push({ type: 'text', key, val, desc }); }
                    addNumber(key, val, desc) { this.items.push({ type: 'number', key, val, desc }); }
                    addChoosing(key, options, val, desc) { this.items.push({ type: 'choose', key, options, val, desc }); }
                    addSwitch(key, val, desc) { this.items.push({ type: 'switch', key, val, desc }); }

                    addEditArray(key,arr,desc){ this.items.push({ type: 'editArray', key, arr, desc });}
                }
            },
            // file: require('../handles/file'),
            getFileHelper: () =>{return new (require('../handles/file')).FileObj(pluginName)},
            getLogger: () => require('../handles/logger').getLogger(pluginName)

        };
        return legacyApi;
    }
}
module.exports = SparkCore;