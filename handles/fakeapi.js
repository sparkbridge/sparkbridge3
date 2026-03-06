// handles/fakeapi.js
const { getLogger } = require('./logger');
const mockLogger = getLogger('FakeBDS');

// 伪造 MC 接口
global.mc = {
    broadcast: (msg) => mockLogger.info(`[游戏内广播] ${msg}`),
    runcmd: (cmd) => mockLogger.info(`[执行控制台命令] ${cmd}`),
    getOnlinePlayers: () => [],
    listen: (event, callback) => mockLogger.debug(`[监听游戏事件] ${event}`)
};

// 伪造 LeviLamina 接口
global.ll = {
    import: (name) => mockLogger.debug(`[LL 导入] ${name}`),
    exports: (name, obj) => mockLogger.debug(`[LL 导出] ${name}`),
    registerPlugin: (name, desc, version) => mockLogger.info(`[LL 注册插件] ${name} v${version.join('.')}`)
};