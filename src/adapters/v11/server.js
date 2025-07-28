const { WebSocketServer, WebSocket } = require('ws');
const OneBot_v11_BaseAdapter = require('./base');

class OneBot_v11_WsServerAdapter extends OneBot_v11_BaseAdapter {
    constructor(port, accessToken) {
        super('OB_v11_Server', accessToken);
        this.port = port;
    }

    listen() {
        this.server = new WebSocketServer({ port: this.port });
        this.logger.info(`OneBot v11 反向 WebSocket 伺服器已在 ws://localhost:${this.port} 啟動`);

        this.server.on('connection', (ws, req) => {
            if (this.accessToken && req.headers['authorization'] !== `Bearer ${this.accessToken}`) {
                ws.close(1008, 'Authorization failed'); return;
            }
            const userId = req.headers['x-self-id'];
            if (!userId) {
                ws.close(1008, 'X-Self-ID is required'); return;
            }
            this.logger.info(`机器人 [${userId}] 已連接。`);
            this.self_id = userId; // 記錄 self_id
            this.emit('bot.online', { self_id: userId });

            ws.on('message', (data) => this._handleV11Event(JSON.parse(data.toString())));
            ws.on('close', () => this.logger.info(`机器人 [${userId}] 已斷開連接。`));
            ws.on('error', (err) => this.logger.error(`机器人 [${userId}] 的 WebSocket 連接出錯`, err));
        });
    }

    start() { this.listen(); }

    _send(data) {
        if (!this.server || !this.server.clients) return;
        this.server.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    }
}

module.exports = OneBot_v11_WsServerAdapter;