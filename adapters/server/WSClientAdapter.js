const ServerAdapterBase = require('./ServerAdapterBase');
const WebSocket = require('ws');
const crypto = require('crypto');

class WSClientsAdapter extends ServerAdapterBase {
    constructor(config) {
        super('WSClients');
        this.clients = new Map();       // { serverId: ws实例 }
        this.serverConfigs = new Map(); // { serverId: {url, password, key, iv} }
    }

    async connect() {
        this.logger.info("分布式客户端适配器已就绪，等待插件注入节点...");
        // 这里不启动任何服务端，等待插件调用 addServer
    }

    // 生成独立的加密秘钥对
    _initCrypto(password) {
        const md5Hash = crypto.createHash('md5').update(password.toUpperCase()).digest('hex');
        return {
            key: Buffer.from(md5Hash.substring(0, 16), 'utf-8'),
            iv: Buffer.from(md5Hash.substring(16, 32), 'utf-8')
        };
    }

    // ==========================================
    // 动态管理连接生命周期
    // ==========================================
    addServer(serverId, url, password) {
        // console.log("正在添加分布式节点...",url,password);
        if (this.clients.has(serverId)) {
            this.removeServer(serverId);
        }
        const cryptoObj = this._initCrypto(password);
        this.serverConfigs.set(serverId, { url, password, ...cryptoObj });
        this._connectTo(serverId);
    }

    removeServer(serverId) {
        const ws = this.clients.get(serverId);
        if (ws) {
            ws.isManualClose = true; // 标记为手动关闭，防止触发断线重连
            ws.close();
            this.clients.delete(serverId);
        }
        this.serverConfigs.delete(serverId);
        this.logger.info(`[${serverId}] 节点已从连接池移除`);
    }

    // 内部连接与重连逻辑
    _connectTo(serverId) {
        const config = this.serverConfigs.get(serverId);
        if (!config) return;

        this.logger.info(`正在连接到子服 [${serverId}] -> ${config.url}`);
        const ws = new WebSocket(config.url);

        ws.on('open', () => {
            this.logger.info(`✅ [${serverId}] 连接成功`);
            this.clients.set(serverId, ws);
            this.emit('server.connected', serverId);
        });

        ws.on('message', (message) => {
            this._handleIncomingMessage(serverId, message);
        });

        ws.on('close', () => {
            this.clients.delete(serverId);
            this.emit('server.disconnected', serverId);

            // 自动断线重连机制 (非手动移除时触发)
            if (!ws.isManualClose) {
                this.logger.warn(`[${serverId}] 连接意外断开，将在 5 秒后尝试重连...`);
                setTimeout(() => this._connectTo(serverId), 5000);
            }
        });

        ws.on('error', (err) => {
            this.logger.error(`[${serverId}] WS 错误: ${err.message}`);
        });
    }

    // ==========================================
    // 加解密与通信逻辑
    // ==========================================
    _handleIncomingMessage(serverId, rawData) {
        const config = this.serverConfigs.get(serverId);
        try {
            const json = JSON.parse(rawData);
            if (json.type === 'encrypted') {
                const decipher = crypto.createDecipheriv('aes-128-cbc', config.key, config.iv);
                let decrypted = decipher.update(json.params.raw, 'base64', 'utf8');
                decrypted += decipher.final('utf8');

                const pack = JSON.parse(decrypted);
                this.emit('server.message', serverId, pack);
            }
        } catch (e) {
            this.logger.error(`[${serverId}] 消息解密/解析失败`);
        }
    }

    _sendEncryptedPack(ws, config, innerPack) {
        try {
            const cipher = crypto.createCipheriv('aes-128-cbc', config.key, config.iv);
            let encrypted = cipher.update(JSON.stringify(innerPack), 'utf8', 'base64');
            encrypted += cipher.final('base64');

            ws.send(JSON.stringify({ type: "encrypted", params: { mode: "aes_cbc_pck7padding", raw: encrypted } }));
            return true;
        } catch (e) { return false; }
    }

    sendCommand(serverId, cmdStr) {
        const ws = this.clients.get(serverId);
        const config = this.serverConfigs.get(serverId);
        if (ws && ws.readyState === WebSocket.OPEN && config) {
            const cmdRequest = { type: "pack", action: "runcmdrequest", params: { cmd: cmdStr, id: Date.now() } };
            return this._sendEncryptedPack(ws, config, cmdRequest);
        }
        return false;
    }

    broadcast(cmdStr) {
        const cmdRequest = { type: "pack", action: "runcmdrequest", params: { cmd: cmdStr, id: Date.now() } };
        this.clients.forEach((ws, serverId) => {
            const config = this.serverConfigs.get(serverId);
            if (ws.readyState === WebSocket.OPEN && config) {
                this._sendEncryptedPack(ws, config, cmdRequest);
            }
        });
    }
}

module.exports = WSClientsAdapter;