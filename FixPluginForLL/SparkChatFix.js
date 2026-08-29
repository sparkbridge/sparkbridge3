// ============================================================
// SparkChatFix.js —— SparkBridge3 专用聊天转发补丁（3.0 版）
// 放到 BDS plugins/ 目录，由 QJS 引擎加载。
//
// 作用：LSE 的 Node 引擎偶尔收不到 onChat（被 QJS 抢占）。
//       本插件在 QJS 侧稳定收到 onChat 后转发给 sparkbridge3，
//       spark 检测到本插件在线后自动切换到"fix 转发"模式，
//       原生 onChat 路径让位，因此无需去重。
// ============================================================

// ==================== 开关 ====================
// 设为 false 可停用本插件，spark 将回退到原生 onChat 路径
const ENABLED = true;
// =============================================

if (!ENABLED) {
    log('[SparkChatFix] 已停用（ENABLED=false），spark 使用原生 onChat 路径');
} else {
    // 登记给 spark：让它知道 fix 在线（spark 导出就绪前自动重试）
    function tryRegister() {
        try {
            if (ll.hasExported("SparkAPIEx", "registerChatFix")) {
                ll.imports("SparkAPIEx", "registerChatFix")();
            } else {
                setTimeout(tryRegister, 1000);
            }
        } catch (e) {
            setTimeout(tryRegister, 1000);
        }
    }
    setTimeout(tryRegister, 1000);

    mc.listen("onChat", (player, msg) => {
        if (player.isSimulatedPlayer()) return true; // 模拟玩家（机器人）不转发
        try {
            ll.imports("SparkAPIEx", "relayChat")(player.realName, player.xuid, msg);
        } catch (e) {
            /* spark 未就绪时静默，游戏内消息不受影响 */
        }
        return true;
    });

    log('[SparkChatFix] 已启用，等待 sparkbridge3 接入...');
}
