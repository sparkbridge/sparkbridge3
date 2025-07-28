const OneBotWsClientAdapter = require('./src/adapters//v11/client');
// 引入新的消息構造輔助函數
const builder = require('./src/adapters/v11/messagebuilder');

const adapter = new OneBotWsClientAdapter('ws://192.168.1.17:8081/', '123456789');
adapter.start();


// 監聽機器人上線事件
adapter.on('bot.online', () => {
    console.log(`机器人 [${adapter.self.user_id || '未知'}] 已成功上线！`);
    // adapter.sendMessage('group', 519916681, [builder.text("你好"), builder.at(2582152047)])
});

// 【重要修改 2】監聽更通用的事件名稱
adapter.on('message.private.friend', async (event) => {
    console.log('--- ✅ 成功收到私聊消息！---');
    console.log(`來自用戶 [${event.user_id}] 的消息: ${event.alt_message}`);
    console.log('完整的 v12 事件對象:', event);
    await adapter.sendMessage('private',event.user_id, text(`已收到你的消息：${event.alt_message}`));
});

// 【重要修改 2】監聽更通用的事件名稱
adapter.on('message.group.normal', async (event) => {
    console.log(event);
    if (event.group !== 519916681)return;
    console.log('--- ✅ 成功收到群聊消息！---');
    console.log(`來自群 [${event.group_id}] 內用戶 [${event.user_id}] 的消息: ${event.alt_message}`);
    console.log('完整的 v12 事件對象:', event);
});
