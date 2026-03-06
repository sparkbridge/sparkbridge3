const { text } = require('../../handles/msgbuilder');

const TARGET_GROUP = spark.env.get("main_group")

function reBuildRawMessage(message) {
    return message
        .filter(item => item.type === 'text')
        .map(item => item.data.text)
        .join('');
}

// 1. QQ -> MC 游戏内
spark.on('message.group.normal', (pack) => {
    // console.log(`[QQ -> MC] 收到消息: ${pack.raw_message}`);
    if (pack.group_id === TARGET_GROUP) {
        // 将 QQ 消息广播到游戏内
        const senderName = pack.sender.card || pack.sender.nickname;
        const content = reBuildRawMessage(pack.message);
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
