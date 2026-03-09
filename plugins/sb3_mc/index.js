const { text } = require('../../handles/msgbuilder');

const TARGET_GROUP = spark.env.get("main_group")

const fileObj = spark.getFileHelper("sb3_mc");
fileObj.initFile("config.json", {
    chat_to_servere_enable: true,
    chat_to_group_enable: true,
    leave_to_group_enable: true,
    join_to_group_enable: true,
    text_format: "%s",
    face_format: "[表情]",
    image_format: "[图片]",
    join_format: "[玩家] %s 进服",
    leave_format: "[玩家] %s 退服",
    chat_to_group_format: "[玩家] %s: %s",
    chat_to_server_format:"[群聊] %s: %s"
})
const conf = JSON.parse(fileObj.read("config.json"));

logger.info("sb3_mc 加载完成");

spark.web.createConfig("sb3_mc")
    .switch("chat_to_servere_nable", conf.chat_to_servere_enable, "是否转发群消息到服务器")
    .switch("chat_to_group_nable", conf.chat_to_group_enable, "是否转发服务器消息到群聊")
    .switch("leave_to_group_nable", conf.leave_to_group_enable, "是否转发玩家离开服务器的消息")
    .switch("join_to_group_nable", conf.join_to_group_enable, "是否转发玩家进服的消息")
    .text("text_format", conf.text_format, "群聊文字消息格式")
    .text("face_format", conf.face_format, "群聊表情消息格式")
    .text("image_format", conf.image_format, "群聊图片消息格式")
    .text("join_format", conf.join_format, "玩家进服消息格式")
    .text("leave_format", conf.leave_format, "玩家退服消息格式")
    .text("chat_to_group_format", conf.chat_to_group_format, "群聊消息格式")
    .text("chat_to_server_format", conf.chat_to_server_format, "群聊消息格式")
    .register();



spark.on("config.update.sb3_mc", (key, val) => {
    conf[key] = val;
    fileObj.write('config.json', conf); // 持久化保存
    logger.info(`基础配置已更新并保存本地: ${key} -> ${val}`);
});

/**
 * 替换字符串中的 %s 占位符
 * @param {string} template 包含占位符的模板字符串（如 "[玩家] %s: %s"）
 * @param  {...any} args 要替换的参数（支持多个参数、数组参数）
 * @returns {string} 替换后的最终字符串
 */
function replacePlaceholders(template, ...args) {
    // 容错：如果模板不是字符串，直接返回空字符串
    if (typeof template !== 'string') {
        return '';
    }

    // 处理参数：如果第一个参数是数组，则展开数组；否则合并所有参数
    let params = [];
    if (args.length === 1 && Array.isArray(args[0])) {
        params = args[0];
    } else {
        params = args;
    }

    // 复制模板避免修改原字符串，逐个替换 %s 占位符
    let result = template;
    let placeholderIndex = 0;

    // 用正则全局匹配 %s，逐个替换
    result = result.replace(/%s/g, () => {
        // 如果参数不足，返回空字符串或保留 %s
        return placeholderIndex < params.length
            ? String(params[placeholderIndex++])  // 转为字符串避免类型问题
            : ''; // 也可以改为保留占位符：return '%s'
    });

    return result.toString();
}

function formatMsg(msg) {
    const formattedMessages = msg.map((t) => {
        switch (t.type) {
            case 'at':
                if (spark.env.get('get_xbox_by_qid')(t.data.qq) == undefined) {
                    return '@' + t.data.qq;
                } else {
                    return '@' + spark.env.get('get_xbox_by_qid')(t.data.qq).xbox;
                }
            case 'text':
                return replacePlaceholders(conf.text_format, t.data.text);
            case 'image':
                return conf.image_format;
            case 'face':
                return  conf.face_format;
        }
    });
    return formattedMessages.join('');
}



// 1. QQ -> MC 游戏内
if(conf.chat_to_servere_enable){
    spark.on('message.group.normal', (pack) => {
        // console.log(`[QQ -> MC] 收到消息: ${pack.raw_message}`);
        if (pack.group_id === TARGET_GROUP) {
            // 将 QQ 消息广播到游戏内
            const senderName = pack.sender.card || pack.sender.nickname;
            const content = formatMsg(pack.message);
            // 调用 BDS 原生接口 (通过沙盒暴露的 mc 对象)
            if (content != "")
                mc.broadcast(replacePlaceholders(conf.chat_to_server_format, senderName, content));
        }
    });
}

// 2. MC 游戏内 -> QQ
// 监听游戏内的玩家聊天事件
if(conf.chat_to_group_enable){
    mc.listen("onChat", (player, chatText) => {
        const playerName = player.realName;
        // const msg = text(`[游戏内] ${playerName}: ${chatText}`);
        // 调用 SparkBridge3 API 发送到群里
        spark.QClient.sendGroupMsg(TARGET_GROUP, replacePlaceholders(conf.chat_to_group_format, playerName, chatText));
        return true; // 允许消息在游戏内正常显示
    });
}

// 3. 玩家进退服通知
if(conf.join_to_group_enable){
    mc.listen("onJoin", (player) => {
        // console.log(conf.join_format)
        // console.log(replacePlaceholders(conf.join_format, player.realName))
        spark.QClient.sendGroupMsg(TARGET_GROUP, replacePlaceholders(conf.join_format, player.realName));
    });
}

if(conf.leave_to_group_enable){
    mc.listen("onLeft", (player) => {
        spark.QClient.sendGroupMsg(TARGET_GROUP, replacePlaceholders(conf.leave_format, player.realName));
    });
}