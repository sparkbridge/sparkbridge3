const ME = require('./package.json');
const path = require('path');
const fs = require('fs');
const JSON5 = require('json5');
const fhelper = require('./handles/file');
const lg = require('./handles/logger');
const logger = lg.getLogger('sparkbridge3');
const tracker = require("./handles/umami");
const SparkCore = require('./core/SparkCore');

console.log(fhelper.read(path.join(__dirname, 'logo.txt')));

process.on('unhandledRejection', (reason, promise) => {
    logger.error("未处理的 Promise 拒绝: ", reason);
});

// ==========================================
// 0. 动态发现与注册可用适配器
// ==========================================
function getAvailableAdapters(type) {
    const dir = path.join(__dirname, `adapters/${type}`);
    if (!fs.existsSync(dir)) return {};

    // 扫描以 Adapter.js 结尾，但排除 Base 类的文件
    const files = fs.readdirSync(dir).filter(f => f.endsWith('Adapter.js') && !f.includes('Base'));
    const registry = {};
    for (const file of files) {
        const name = file.replace('Adapter.js', ''); // 提取核心名称，例如 "OneBotWS"
        registry[name] = require(path.join(dir, file));
    }
    return registry;
}

const BOT_ADAPTERS = getAvailableAdapters('bot');
const SERVER_ADAPTERS = getAvailableAdapters('server');
logger.info(`已发现机器人适配器: [${Object.keys(BOT_ADAPTERS).join(', ')}]`);
logger.info(`已发现服务端适配器: [${Object.keys(SERVER_ADAPTERS).join(', ')}]`);

// ==========================================
// 1. 读取与初始化根配置 (base/config.json)
// ==========================================
let rootFileObj = new fhelper.FileObj('base');
let rawConfig = rootFileObj.read('config.json');
tracker.trackEvent("startup", { v: ME.version });
tracker.trackPage("/", "startup");

// 注入全新的配置项：选择适配器、选择服务器环境、以及中控模式需要的密码端口
const defaultConfig = {
    // === 机器人端配置 ===
    bot_adapter: Object.keys(BOT_ADAPTERS)[0] || 'OneBotWS',
    target: "ws://127.0.0.1:3001",
    qid: 114514,
    pwd: '',
    ws_type: 0,
    server_port: 3002,
    admin_qq: [123456789],
    main_group: 987654321,

    // === 游戏端(服务器)环境配置 ===
    server_adapter: Object.keys(SERVER_ADAPTERS)[0] || 'LocalServer',
    hub_port: 8887,
    password: 'YourSecretPassword',

    // === 全局配置 ===
    debug: false
};

let CONFIG;
try {
    CONFIG = rawConfig ? JSON5.parse(rawConfig) : defaultConfig;
} catch (e) {
    logger.error("核心配置文件 base/config.json 格式错误，将使用默认配置启动！");
    CONFIG = { ...defaultConfig };
}

let modified = false;
for (let key in defaultConfig) {
    if (CONFIG[key] === undefined) {
        CONFIG[key] = defaultConfig[key];
        modified = true;
    }
}

// 检查配置的适配器是否真的存在，如果被删除了就回退到默认
if (!BOT_ADAPTERS[CONFIG.bot_adapter]) {
    logger.warn(`未找到配置的机器人适配器 [${CONFIG.bot_adapter}]，已重置为默认`);
    CONFIG.bot_adapter = Object.keys(BOT_ADAPTERS)[0];
    modified = true;
}
if (!SERVER_ADAPTERS[CONFIG.server_adapter]) {
    logger.warn(`未找到配置的服务器适配器 [${CONFIG.server_adapter}]，已重置为默认`);
    CONFIG.server_adapter = Object.keys(SERVER_ADAPTERS)[0];
    modified = true;
}

if (!rawConfig || modified) {
    rootFileObj.write('config.json', JSON.stringify(CONFIG, null, 4));
}

lg.setRootHeader('SB3');

// ==========================================
// 2. 初始化核心系统与环境变量池
// ==========================================
const core = new SparkCore(CONFIG);

for (let key in CONFIG) {
    core.sharedEnv[key] = CONFIG[key];
}

// ==========================================
// 3. 动态实例化并注册网络适配器
// ==========================================
// 挂载机器人适配器
if (BOT_ADAPTERS[CONFIG.bot_adapter]) {
    const BotAdapterClass = BOT_ADAPTERS[CONFIG.bot_adapter];
    core.useBotAdapter(new BotAdapterClass(CONFIG));
}

// 挂载服务器适配器
if (SERVER_ADAPTERS[CONFIG.server_adapter]) {
    const ServerAdapterClass = SERVER_ADAPTERS[CONFIG.server_adapter];
    core.useServerAdapter(new ServerAdapterClass(CONFIG));
}

const adapterKeys = Object.keys(BOT_ADAPTERS);
const currentBotIndex = adapterKeys.indexOf(CONFIG.bot_adapter); // 找到 "OneBotWS" 对应的索引 0
const serverKeys = Object.keys(SERVER_ADAPTERS);
const currentServerIndex = serverKeys.indexOf(CONFIG.server_adapter);


// ==========================================
// 4. 挂载老版本 BDS 环境兼容与本地调试
// ==========================================
global.spark = core.getLegacyAPI('System', 'base');
global.spark.debug = CONFIG.debug;

if (typeof mc !== 'undefined') {
    global.spark.onBDS = true;
    global.ll.import = ll.imports;
    global.ll.exports = ll.exports;
    ll.registerPlugin("sparkbridge3", "a modern qq bot system", [3, 0, 0]);
} else {
    require('./handles/fakeapi');
    console.log('\n');
    logger.warn('==== 本地开发调试模式 ====');
    logger.warn("MC类已被覆盖，数据存储已自动转移到 testdata 文件夹");
    logger.warn('==========================\n');
}

// ==========================================
// 5. 注册原生 Web 后台的核心配置面板
// ==========================================
core.on('core.ready', () => {
    spark.web.createConfig("base")
        // 机器人设置
        .select("bot_adapter", Object.keys(BOT_ADAPTERS), currentBotIndex, "使用哪个机器人适配器协议")
        .text("target", CONFIG.target, "连接地址 (Go-cqhttp/Napcat等)")
        .number("qid", CONFIG.qid, "机器人QQ号码")
        .select("ws_type", ["正向WS", "反向WS"], CONFIG.ws_type, "Websocket连接类型")
        .number("server_port", CONFIG.server_port, "反向 WS 监听端口")
        .text("pwd", CONFIG.pwd, "机器人连接鉴权密码 (Access Token)")
        .array("admin_qq", CONFIG.admin_qq, "超级管理员QQ号")
        .number("main_group", CONFIG.main_group, "主群号")

        // 游戏服务器设置
        .select("server_adapter", Object.keys(SERVER_ADAPTERS), currentServerIndex, "使用哪个游戏端运行模式")
        .number("hub_port", CONFIG.hub_port, "中控 WebSocket 监听端口 (仅 WSServer 模式有效)")
        .text("password", CONFIG.password, "中控服务器通讯秘钥 (必须与子服一致)")

        // 全局
        .switch("debug", CONFIG.debug, "开发者日志模式")
        .register();
});

core.on("config.update.base", (key, newValue) => {
    if (spark.debug) console.log(`核心配置 [${key}] 已更改为 ${newValue} ${typeof newValue}。`);

    if (key == 'admin_qq') {
        newValue = newValue.map(qq => Number(qq));
    }
    if (key === 'bot_adapter') {
        const adapterKeys = Object.keys(BOT_ADAPTERS);
        newValue = adapterKeys[newValue];
    }
    if (key === 'server_adapter') {
        const serverKeys = Object.keys(SERVER_ADAPTERS);
        newValue = serverKeys[newValue];
    }

    CONFIG[key] = newValue;
    rootFileObj.write('config.json', JSON.stringify(CONFIG, null, 4));

    global.spark.env.set(key, newValue);

    if (key === 'debug') {
        global.spark.debug = newValue;
        logger.info(`开发者模式已${newValue ? "开启" : "关闭"}`);
    } else {
        logger.info(`核心配置 [${key}] 已更改。更改适配器或端口设置需要重启框架才能生效。`);
    }
});

// ==========================================
// 6. 正式启动 SparkBridge3 核心
// ==========================================
core.start().then(() => {
    core.emit('core.ready');
    logger.info(`✨ SparkBridge3 启动完毕！当前核心版本: ${ME.version} ✨`);
}).catch(e => {
    console.log(e);
    logger.error("框架启动失败: ", e)
});

// ==========================================
// 7. 添加卸载事件（解决重载时连接占用问题）
// ==========================================
if (typeof ll !== 'undefined' && ll.onUnload) {
    ll.onUnload(() => {
        logger.info('SparkBridge3 正在卸载，安全清理所有连接...');

        // 1. 关闭所有 Bot 适配器连接
        if (core.botAdapters) {
            core.botAdapters.forEach(adp => {
                try {
                    if (adp.disconnectAllClients) adp.disconnectAllClients();
                    if (adp.client && adp.client.close) adp.client.close();
                } catch (e) { logger.error(`清理 Bot 适配器异常: ${e.message}`); }
            });
        }

        // 2. 关闭所有 Server 适配器连接 (如 WebSocket 服务端)
        if (core.serverAdapters) {
            core.serverAdapters.forEach(adp => {
                try {
                    // 关闭 WSServerAdapter 启动的 ws.Server
                    if (adp.wss && adp.wss.close) adp.wss.close();
                } catch (e) { logger.error(`清理 Server 适配器异常: ${e.message}`); }
            });
        }

        logger.info('✓ 所有网络连接已被强制阻断，可以安全重载。');
    });
}