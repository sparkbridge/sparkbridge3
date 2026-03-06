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
    image_format: "[图片]"
})
const conf = fileObj.read("config.json");

logger.info("sb3_mc 加载完成");

spark.web.createConfig("sb3_regex")
    .switch("chat_to_servere_nable", conf.chat_to_servere_enable, "是否转发群消息到服务器")
    .switch("chat_to_group_nable", conf.chat_to_group_enable, "是否转发服务器消息到群聊")
    .switch("leave_to_group_nable", conf.leave_to_group_enable, "是否转发玩家离开服务器的消息")
    .switch("join_to_group_nable", conf.join_to_group_enable, "是否转发玩家进服的消息")
    .text("text_format", conf.etxt_format, "群聊文字消息格式")
    .text("face_format", conf.face_format, "群聊表情消息格式")
    .text("image_format", conf.image_format, "群聊图片消息格式")
    .register();



spark.on("config.update.sb3_mc", (key, val) => {
    conf[key] = val;
    fileObj.write('config.json', conf); // 持久化保存
    logger.info(`基础配置已更新并保存本地: ${key} -> ${val}`);
});
function formatMsg(msg) {
    const formattedMessages = msg.map((t) => {
        switch (t.type) {
            case 'at':
                if (spark.mc.getXbox(t.data.qq) == undefined) {
                    return '@' + t.data.qq;
                } else {
                    return '@' + spark.mc.getXbox(t.data.qq);
                }
            case 'text':
                return t.data.text;
            case 'image':
                return '[图片]';
            case 'face':
                return '[表情]';
        }
    });
    return formattedMessages.join('');
}



// 1. QQ -> MC 游戏内
spark.on('message.group.normal', (pack) => {
    // console.log(`[QQ -> MC] 收到消息: ${pack.raw_message}`);
    if (pack.group_id === TARGET_GROUP) {
        // 将 QQ 消息广播到游戏内
        const senderName = pack.sender.card || pack.sender.nickname;
        const content = formatMsg(pack.message);
        // 调用 BDS 原生接口 (通过沙盒暴露的 mc 对象)
        if(content!="")
            mc.broadcast(`[QQ群] ${senderName}: ${content}`);
    }
});

// 2. MC 游戏内 -> QQ
// 监听游戏内的玩家聊天事件
mc.listen("onChat", (player, chatText) => {
    const playerName = player.realName;
    const msg = text(`[游戏内] ${playerName}: ${chatText}`);
    // 调用 SparkBridge3 API 发送到群里
    spark.QClient.sendGroupMsg(TARGET_GROUP, msg);
    return true; // 允许消息在游戏内正常显示
});

// 3. 玩家进退服通知
mc.listen("onJoin", (player) => {
    spark.QClient.sendGroupMsg(TARGET_GROUP, text(`玩家 ${player.realName} 加入了服务器`));
});

mc.listen("onLeft", (player) => {
    spark.QClient.sendGroupMsg(TARGET_GROUP, text(`玩家 ${player.realName} 退出了服务器`));
});
