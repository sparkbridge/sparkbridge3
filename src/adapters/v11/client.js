const { WebSocket } = require('ws');
const OneBot_v11_BaseAdapter = require('./base');
const { boom } = require('../../services/reconnect');

class OneBot_v11_WsClientAdapter extends OneBot_v11_BaseAdapter {
    constructor(targetUrl, accessToken) {
        super('OB_v11_Client', accessToken);
        this.targetUrl = targetUrl;
    }

    connect() {
        this.logger.info(`正在以 [原生 v11 模式] 連接到 ${this.targetUrl}...`);
        const headers = this.accessToken ? { Authorization: 'Bearer ' + this.accessToken } : {};
        this.client = new WebSocket(this.targetUrl, { headers });

        this.client.on('open', () => this.logger.info('WebSocket 客戶端連接成功！'));
        this.client.on('message', (data) => this._handleV11Event(JSON.parse(data.toString())));
        this.client.on('error', (e) => this.logger.error('WebSocket 連接出錯！', e));
        this.client.on('close', () => {
            const waitTime = boom();
            this.logger.warn(`連接已斷開，將在 ${(new Date(Date.now() + waitTime)).toLocaleString()} 嘗試重連...`);
            setTimeout(() => this.connect(), waitTime);
        });
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

module.exports = OneBot_v11_WsClientAdapter;