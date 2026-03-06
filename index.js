const ME = require('./package.json');
const path = require('path');
const JSON5 = require('json5'); // 支持带注释的 JSON 格式
const fhelper = require('./handles/file');
const lg = require('./handles/logger');
const logger = lg.getLogger('sparkbridge3');

const SparkCore = require('./core/SparkCore');
const OneBotWSAdapter = require('./adapters/OneBotWSAdapter');
console.log(fhelper.read(path.join(__dirname, 'logo.txt')));




process.on('unhandledRejection', (reason, promise) => {
    logger.error("未处理的 Promise 拒绝: ", reason);
});
// ==========================================
// 1. 读取与初始化根配置 (base/config.json)
// ==========================================
let rootFileObj = new fhelper.FileObj('base');
let rawConfig = rootFileObj.read('config.json');

// 定义默认的核心与全局共享配置
const defaultConfig = {
    target: "ws://127.0.0.1:3001",
    qid: 114514,
    pwd: '',
    ws_type: 0,
    server_port: 3002,
    debug: true,
    admin_qq: 123456789,  // [新增] 注入主管理员QQ
    main_group: 987654321   // [新增] 注入主群号
};

let CONFIG;
try {
    CONFIG = rawConfig ? JSON5.parse(rawConfig) : defaultConfig;
} catch (e) {
    logger.error("核心配置文件 base/config.json 格式错误，将使用默认配置启动！");
    CONFIG = { ...defaultConfig };
}

// 自动补全缺失的新配置项并格式化保存
let modified = false;
for (let key in defaultConfig) {
    if (CONFIG[key] === undefined) {
        CONFIG[key] = defaultConfig[key];
        modified = true;
    }
}
if (!rawConfig || modified) {
    rootFileObj.write('config.json', JSON.stringify(CONFIG, null, 4));
}

// 可选：设置全局日志头部，原版没有，这是新版 logger 的特性
lg.setRootHeader('SB3');

// ==========================================
// 2. 初始化核心系统与环境变量池
// ==========================================
const core = new SparkCore(CONFIG);



// 🔥 核心动作：将 base 配置的全部内容注入到全局环境变量池！
// 这样插件里直接用 spark.env.get('main_group') 就能拿到主群号
for (let key in CONFIG) {
    core.sharedEnv[key] = CONFIG[key];
}

// ==========================================
// 3. 注册网络适配器
// ==========================================
const defaultAdapter = new OneBotWSAdapter({
    target: CONFIG.target,
    ws_type: CONFIG.ws_type,
    port: CONFIG.server_port,
    qid: CONFIG.qid,
    pwd: CONFIG.pwd
});
core.useAdapter(defaultAdapter);

// ==========================================
// 4. 挂载老版本 BDS 环境兼容与本地调试
// ==========================================
global.spark = core.getLegacyAPI();
global.spark.debug = CONFIG.debug; // 同步 debug 状态

if (typeof mc !== 'undefined') {
    global.spark.onBDS = true;
    // 针对 BDS LegacyScriptEngine 的兼容方案
    global.ll.import = ll.imports;
    global.ll.exports = ll.exports;
    ll.registerPlugin("sparkbridge3", "a modern qq bot system", [3, 0, 0]);
} else {
    // 自动加载假 API，方便开发者在本地 PC 上开发测试插件
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
    // 使用新版 Fluent API 生成名为 base 的核心设置项
    spark.web.createConfig("base")
        .text("target", CONFIG.target, "连接地址 (Go-cqhttp/Napcat)")
        .number("qid", CONFIG.qid, "机器人QQ号码")
        .select("ws_type", ["正向WS", "反向WS"], CONFIG.ws_type, "Websocket连接类型")
        .number("server_port", CONFIG.server_port, "反向 WS 监听端口")
        .text("pwd", CONFIG.pwd, "连接鉴权密码 (Access Token)")
        .switch("debug", CONFIG.debug, "开发者日志模式")
        .number("admin_qq", CONFIG.admin_qq, "超级管理员QQ号 (拥有最高权限)")
        .number("main_group", CONFIG.main_group, "机器人主群号 (消息互通默认目标)")
        .register();
});

// 监听 Web 前端修改了 base 配置的事件
core.on("config.update.base", (key, newValue) => {
    console.log(newValue);
    CONFIG[key] = newValue;
    console.log(`核心配置 [${key}] 已更改为 ${newValue} ${typeof newValue}。`);
    // 存入本地文件
    rootFileObj.write('config.json', JSON.stringify(CONFIG, null, 4));

    // 🔥 关键：动态更新环境变量池，并自动广播给所有业务插件！
    global.spark.env.set(key, newValue);

    if (key === 'debug') {
        global.spark.debug = newValue;
        logger.info(`开发者模式已${newValue ? "开启" : "关闭"}`);
    } else {
        logger.info(`核心配置 [${key}] 已更改为 ${newValue}。部分适配器设置可能需要重启生效。`);
    }
});

// ==========================================
// 6. 正式启动 SparkBridge3 核心
// ==========================================
core.start().then(() => {
    core.emit('core.ready');
    logger.info(`✨ SparkBridge3 启动完毕！当前核心版本: ${ME.version} ✨`);
}).catch(e =>{console.log(e); logger.error("框架启动失败: ", e)});