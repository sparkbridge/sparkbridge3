const { text, at} = require('../../handles/msgbuilder');

// 1. 注册原生动态配置 (使用 SparkBridge3 新特性)
const WebConfigBuilder = spark.telemetry.WebConfigBuilder;
let conf = new WebConfigBuilder("sb3_system");
conf.addText("admin_qq", "123456789", "管理员QQ号(拥有最高权限)");
conf.addSwitch("enable_ping", true, "是否允许普通用户使用ping命令");
spark.web.registerConfig(conf); // 新版原生注册 API

// 读取本地配置 (使用重构后的工具类)
const fhelper = require('../../handles/file');
let fileHelper = new fhelper.FileObj('sb3_system');
let currentConfig = JSON.parse(fileHelper.read('config.json') || '{"admin_qq":"123456789","enable_ping":true}');

// 监听网页配置修改事件
spark.on("config.update.sb3_system", (key, newValue) => {
    currentConfig[key] = newValue;
    fileHelper.write('config.json', currentConfig);
    console.log(`[系统模块] 配置已更新: ${key} -> ${newValue}`);
});


// 2. 核心事件监听
spark.on('gocq.pack', (pack) => {
    // 过滤非群聊消息
    if (pack.post_type !== 'message' || pack.message_type !== 'group') return;

    const msgText = pack.raw_message;

    // Ping 测试功能
    if (msgText === '#ping' && currentConfig.enable_ping) {
        const replyMsg = [
            at(pack.sender.user_id),
            text(" Pong! SparkBridge3 运行正常。")
        ];
        console.log(`[系统模块] 用户 ${pack.sender.nickname} (QQ: ${pack.sender.user_id}) 发送了 ping 命令。`);
        spark.QClient.sendGroupMsg(pack.group_id, replyMsg).then(data=>{
            console.log(`[系统模块] 回复了用户 ${pack.sender.nickname} (QQ: ${pack.sender.user_id}) 的 ping 命令。`);
        });

    }

    // 重载插件功能 (仅限管理员)
    if (msgText === '#reload' && pack.sender.user_id.toString() === currentConfig.admin_qq) {
        spark.sendGroupMsg(pack.group_id, text("正在通知核心重载配置..."));
        // 触发自定义事件，核心层可以监听此事件执行重载逻辑
        spark.emit('system.request_reload');
    }
});