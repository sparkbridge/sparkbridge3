// ============================================================================
// handles/chatrelay.js
// 聊天中继：透明修复 LSE Node 引擎偶尔吞掉 onChat 的问题
//
// 模式切换（无需去重）：
//   - fix 未检测到（fixActive=false）：原生路径照常工作，和现在完全一致
//   - fix 在线（fixActive=true）：原生 onChat 让位，由 QJS 转发作为唯一来源
// 检测方式：registerChatFix() 显式登记，或 relayChat() 第一次被调用即自动激活。
//
// 影响范围：只影响 spark 进程内注册的 onChat 回调集合，
//           不碰 BDS、不碰其他插件的监听器、不碰其他游戏事件。
// ============================================================================

const chatCbs = new Set();       // 所有注册了 onChat 的回调
let fixActive = false;           // QJS SparkChatFix 是否在线
let realOnChatBound = false;     // 是否已向真正的 mc.listen 注册过一次 onChat

// 包装 mc.listen；必须在任何插件注册 onChat 之前调用
function patchMC(mc) {
    // 预检可写性：数据属性 writable=false 或访问器无 setter 时直接抛错，
    // 由调用方（index.js）捕获并降级为原生路径
    const desc = Object.getOwnPropertyDescriptor(mc, 'listen');
    if (desc && !desc.writable && !desc.set) {
        throw new Error('mc.listen 属性不可写且无 setter，无法安装 onChat 中继');
    }
    const realListen = mc.listen;
    mc.listen = function (event, cb) {
        if (event === 'onChat' && typeof cb === 'function') {
            chatCbs.add(cb);
            // 只向真正的 mc.listen 注册一次 onChat，避免每个回调都注册导致重复投递
            if (!realOnChatBound) {
                realOnChatBound = true;
                realListen.call(mc, 'onChat', (player, msg) => {
                    if (fixActive) return true; // fix 模式：原生路径让位（fix 会转发）
                    let blocked = false;
                    for (const c of chatCbs) {
                        try { if (c(player, msg) === false) blocked = true; } catch (e) { /* 单个回调异常不影响其他回调 */ }
                    }
                    return !blocked; // 保留原生拦截语义
                });
            }
            return true;
        }
        return realListen.call(mc, event, cb); // 其他事件原样透传
    };
    return true;
}

// 供 QJS SparkChatFix 调用：把 QJS 收到的 onChat 投递给 spark 全部 onChat 回调
function relayChat(name, xuid, msg) {
    if (typeof mc === 'undefined') return;
    fixActive = true; // 收到转发 = fix 在线（幂等，与 registerChatFix 等效）
    let pl = null;
    try {
        pl = mc.getPlayer(xuid) || mc.getPlayer(name);
    } catch (e) {
        /* 查找失败则用普通对象兜底 */
    }
    for (const cb of chatCbs) {
        try { cb(pl || { realName: name, name, xuid }, msg); } catch (e) { /* 单个回调异常不影响其他回调 */ }
    }
}

function setFixActive(v) { fixActive = !!v; }
function isFixActive() { return fixActive; }

module.exports = { patchMC, relayChat, setFixActive, isFixActive };
