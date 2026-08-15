/**
 * sb3_gskconfig —— Gensokyo 对接助手插件
 * 
 * 在 SparkBridge Web 面板提供"Gensokyo 配置生成"页面：
 *   客户填写必要字段（应用ID/密钥/端口/WS令牌）→ 生成完整 config.yml
 *   替换 Gensokyo 目录下的 config.yml 即可完成官方 bot 对接
 * 
 * 实时群聊信息显示：
 *   首次使用官方 bot 时，客户不知道群里的用户是谁（官方 openid 是乱码）。
 *   开启 show_group_msg 后，插件会把收到的群消息实时用 logger 打印到控制台，
 *   方便客户识别身份、填写 master_id（管理员）等配置。
 *   关闭后不打印（默认关闭，避免刷屏）。
 * 
 * 设计要点：
 *   - permission 必须是 key（core 权限拿不到正确 folder，registerPage 会 404）
 *   - 纯静态 HTML（零后端依赖），由 spark.web.registerPage 挂载
 *   - 生成器内置群服互通推荐默认值
 *   - 显式写出关键 bool/int 默认值（Gensokyo 的自动补全跳过 bool/int 类型）
 *   - 默认关闭白名单系统（避免 v_white_prefix_mode 拦截所有消息的坑）
 */
const logger = spark.getLogger();
const fileObj = spark.getFileHelper('sb3_gskconfig');

// 配置
const initconf = {
    show_group_msg: false      // 是否实时打印收到的群聊信息到控制台（首次配置官方bot时建议开启）
};
fileObj.initFile("config.json", initconf);
const config = JSON.parse(fileObj.read('config.json'));

// Web 配置项（可在插件配置面板里开关）
spark.web.createConfig("sb3_gskconfig")
    .switch("show_group_msg", config.show_group_msg, "实时打印收到的群聊信息到控制台（首次使用官方bot时用于识别群成员）")
    .register();

spark.on("config.update.sb3_gskconfig", (key, val) => {
    config[key] = val;
    fileObj.write('config.json', config);
    logger.info(`sb3_gskconfig 配置已更新: ${key} = ${val}`);
});

// 实时群聊信息打印
spark.on('gocq.pack', (pack) => {
    if (!config.show_group_msg) return;
    if (!pack || pack.post_type !== 'message' || pack.message_type !== 'group') return;

    // 提取关键信息：谁发的、内容、官方身份标识（openid 是识别身份的原始值）
    const groupId = pack.group_id;
    const userId = pack.user_id;
    const sender = pack.sender || {};
    const nickname = sender.nickname || sender.card || '(无昵称)';
    const rawMessage = typeof pack.raw_message === 'string' ? pack.raw_message : JSON.stringify(pack.message || '');
    const msgId = pack.message_id;

    // 官方 openid 原始值（增强配置里有 real_user_id 字段）
    const realId = pack.real_user_id || userId;

    logger.info(`[群消息] 群=${groupId} | 用户=${userId} (openid=${realId}) | 昵称=${nickname} | 内容: ${rawMessage} | msg_id=${msgId}`);
});

// Web 配置生成页面（/plugin-views/sb3_gskconfig/web/gensokyo-config-gen.html）
spark.web.registerPage('Gensokyo配置生成', 'web/gensokyo-config-gen.html');

logger.info('sb3_gskconfig 已加载：Web 面板 → Gensokyo配置生成');
