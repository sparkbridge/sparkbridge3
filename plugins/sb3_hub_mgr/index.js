// plugins/hub_manager/index.js
const logger = spark.getLogger();
const fileHelper = spark.getFileHelper('sb3_hub_mgr');
// console.log(spark.hub.isActive())
if (!spark.hub.isActive()) {
    logger.warn('本插件仅支持 Hub 模式，已忽略。');
    // return;
    throw new Error('本插件仅支持 Hub 模式，已忽略。');
}

// 1. 本地持久化存储结构
// servers.json 数据格式: { "Lobby": { "url": "ws://...", "password": "xxx" } }
let serversDB = {};
const dbRaw = fileHelper.read('servers.json');
if (dbRaw) {
    serversDB = JSON.parse(dbRaw);
} else {
    fileHelper.write('servers.json', JSON.stringify({}, null, 4));
}

function saveDB() {
    fileHelper.write('servers.json', JSON.stringify(serversDB, null, 4));
}

// 2. 框架启动时，自动将数据库中的节点注入到底层连接池
spark.on('core.ready', () => {
    logger.info(`正在恢复 ${Object.keys(serversDB).length} 个服务器节点连接...`);
    for (const [id, config] of Object.entries(serversDB)) {
        spark.hub.addServerNode(id, config.url, config.password);
    }
});
spark.web.registerPage("远程服务器管理", "index.html")
// ==========================================
// 3. 对接前端 Vue 的 RESTful API 接口 (CRUD)
// 挂载前缀默认是 /api/plugin/hub_manager
// ==========================================

// [Read] 获取所有服务器列表及在线状态
spark.web.registerApi('GET', '/hub_mgr/servers', (req, res) => {
    const list = Object.keys(serversDB).map(id => {
        return {
            id: id,
            url: serversDB[id].url,
            password: serversDB[id].password,
            status: spark.hub.getNodeStatus(id) // 实时状态
        };
    });
    res.json({ code: 200, data: list });
});

// [Create / Update] 添加或修改服务器
spark.web.registerApi('POST', '/hub_mgr/servers', (req, res) => {
    const { id, url, password } = req.body;
    if (!id || !url || !password) {
        return res.json({ code: 400, msg: "缺少必要参数" });
    }

    serversDB[id] = { url, password };
    saveDB();

    // 通知底层马上发起连接 (或重连)
    spark.hub.addServerNode(id, url, password);

    res.json({ code: 200, msg: "保存并连接成功" });
});

// [Delete] 移除服务器
spark.web.registerApi('DELETE', '/hub_mgr/servers', (req, res) => {
    const { id } = req.query; // 使用 /servers?id=xxx
    if (!id || !serversDB[id]) {
        return res.json({ code: 404, msg: "未找到该服务器" });
    }

    delete serversDB[id];
    saveDB();

    // 通知底层强制断开连接
    spark.hub.removeServerNode(id);

    res.json({ code: 200, msg: "移除成功" });
});

spark.web.registerApi('POST', '/hub_mgr/command', (req, res) => {
    const { id, command } = req.body;

    if (!id || !command) {
        return res.json({ code: 400, msg: "缺少必要参数 (id, command)" });
    }

    // 调用 Core 提供的底层方法发送指令
    const success = spark.hub.sendCommand(id, command);

    if (success) {
        logger.info(`[Web指令] 已向子服 [${id}] 发送指令: ${command}`);
        res.json({ code: 200, msg: "指令下发成功" });
    } else {
        logger.warn(`[Web指令] 向子服 [${id}] 发送指令失败，目标可能未连接`);
        res.json({ code: 500, msg: "发送失败，目标服务器不在线或未就绪" });
    }
});

spark.on('server.message', (serverId, data) => {
    // 收到数据时，框架底层（Adapter）已经完成了解密和 JSON 解析
    // 这里的 data 就是一个原生的 JS 对象，我们直接格式化打印出来
    logger.info(`⬇️ 收到来自子服 [${serverId}] 的解析数据:\n${JSON.stringify(data, null, 2)}`);

    // 未来你可以在这里加上具体的业务逻辑：
    // if (data.action === 'chat') { ... 转发给 QQ 群 ... }
    // if (data.action === 'runcmdreply') { ... 指令执行结果 ... }
    switch(data.cause){
        case 'join':
            logger.info(`${data.params.sender} 已加入子服 [${serverId}] `)
            break;
        case 'quit':
            logger.info(`${data.params.sender} 已退出子服 [${serverId}] `)
            break;
        case 'chat':
            logger.info(`${data.params.sender} : ${data.params.msg}`)
            break;
    }
});