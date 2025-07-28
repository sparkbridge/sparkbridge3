const { WebSocket } = require('ws');
const OneBot_v12_BaseAdapter = require('./base');
const { boom } = require('../../../services/reconnect');

class OneBot_v12_WsClientAdapter extends OneBot_v12_BaseAdapter {
    constructor(targetUrl, accessToken) {
        super('OB_v12_Client', accessToken);
        this.targetUrl = targetUrl;
    }

    connect() {
        this.logger.info(`正在連接到 OneBot v12 伺服器: ${this.targetUrl}...`);
        const headers = this.accessToken ? { Authorization: 'Bearer ' + this.accessToken } : {};
        this.client = new WebSocket(this.targetUrl, { headers });

        this.client.on('message', (data) => {
            const event = JSON.parse(data.toString());
            if (event.retcode !== undefined && event.echo) {
                this._handleActionResponse(event);
            } else if (event.id && event.type) {
                this._handleEvent(event);
            }
        });

        this.client.on('error', (e) => this.logger.error('WebSocket 連接出錯！', e));
        this.client.on('close', () => {
            const waitTime = boom();
            this.logger.warn(`連接已斷開，將在 ${(new Date(Date.now() + waitTime)).toLocaleString()} 嘗試重連...`);
            setTimeout(() => this.connect(), waitTime);
        });
    }

    _handleEvent(event) {
        if (event.type === 'meta' && event.detail_type === 'connect') {
            this.self = event.self;
            this.logger.info(`成功連接到平台 [${this.self.platform}] 的机器人 [${this.self.user_id}]`);
            this.emit('bot.online', event);
            return;
        }
        const eventName = [event.type, event.detail_type, event.sub_type].filter(Boolean).join('.');
        this.emit(eventName, event);
    }

    start() { this.connect(); }

    _send(data) {
        if (this.client && this.client.readyState === WebSocket.OPEN) {
            this.client.send(data);
        } else {
            this.logger.error('無法發送數據，WebSocket 未連接。');
        }
    }
}

module.exports = OneBot_v12_WsClientAdapter;