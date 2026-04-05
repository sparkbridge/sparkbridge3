// adapters/server/LocalServerAdapter.js
const ServerAdapterBase = require('./ServerAdapterBase');

class LocalServerAdapter extends ServerAdapterBase {
    constructor(config) {
        super('LocalBDS');
        // 本地主服务器的固定 ID
        this.localServerId = config.local_server_id || 'Local_Master';
    }

    async connect() {
        // 环境检测：如果不在 BDS 环境内，直接退出
        if (typeof mc === 'undefined') {
            this.logger.warn('当前非 BDS 环境，本地服务器适配器已跳过加载。');
            return;
        }

        this.logger.info(`本地服务器适配器已启动，ServerID: [${this.localServerId}]`);

        // 模拟触发连接成功事件，让 Core 知道主服务器在线
        // 延迟触发以确保 Core 已经准备好接收事件
        setTimeout(() => {
            this.emit('server.connected', this.localServerId);
        }, 1000);

        // ==========================================
        // 在这里拦截本地 BDS 的事件，并转发给 Core
        // ==========================================

        // 示例：拦截玩家聊天事件
        mc.listen("onChat", (player, msg) => {
            const data = {
                type: 'chat',
                player: player.realName,
                xuid: player.xuid,
                msg: msg
            };
            // 抛给总线
            this.emit('server.message', this.localServerId, data);
            return true;
        });

        // 示例：拦截玩家进服事件
        mc.listen("onJoin", (player) => {
            const data = {
                type: 'join',
                player: player.realName,
                xuid: player.xuid
            };
            this.emit('server.message', this.localServerId, data);
        });
    }

    sendCommand(serverId, cmdStr) {
        // 如果指定的不是本地服务器，或者不是要求广播，则忽略
        if (serverId !== this.localServerId && serverId !== 'all') {
            return false;
        }

        if (typeof mc !== 'undefined') {
            // 调用 BDS 底层接口执行指令
            const result = mc.runcmdEx(cmdStr);
            return result.success;
        }
        return false;
    }

    broadcast(cmdStr) {
        this.sendCommand('all', cmdStr);
    }
}

module.exports = LocalServerAdapter;