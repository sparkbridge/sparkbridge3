const ServerAdapterBase = require('./ServerAdapterBase');
const WebSocket = require('ws');
const crypto = require('crypto');

class WSServerAdapter extends ServerAdapterBase {
    constructor(config) {
        super('WSServer');
        this.port = config.hub_port || 8887;
        this.password = config.password; // 需要从配置读取
        this.clients = new Map();

        // 初始化加密秘钥
        this._initCrypto();
    }

    /**
     * 1. 初始化 AES 秘钥和 IV
     */
    _initCrypto() {
        const md5Hash = crypto.createHash('md5').update(this.password.toUpperCase()).digest('hex');
        this.key = Buffer.from(md5Hash.substring(0, 16), 'utf-8');
        this.iv = Buffer.from(md5Hash.substring(16, 32), 'utf-8');
        this.logger.debug('AES 秘钥初始化完成 (aes-128-cbc)');
    }

    /**
     * 2. 加密函数 (AES/CBC/PKCS7Padding)
     */
    encrypt(text) {
        try {
            const cipher = crypto.createCipheriv('aes-128-cbc', this.key, this.iv);
            let encrypted = cipher.update(text, 'utf8', 'base64');
            encrypted += cipher.final('base64');
            return encrypted;
        } catch (e) {
            this.logger.error('加密数据失败:', e.message);
            return null;
        }
    }

    /**
     * 3. 解密函数
     */
    decrypt(base64Data) {
        try {
            const decipher = crypto.createDecipheriv('aes-128-cbc', this.key, this.iv);
            let decrypted = decipher.update(base64Data, 'base64', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (e) {
            // 解密失败时不抛出异常，而是交由上层处理
            return null;
        }
    }

    /**
     * 4. 建立 WebSocket Server
     */
    async connect() {
        return new Promise((resolve) => {
            this.wss = new WebSocket.Server({ port: this.port });

            this.wss.on('listening', () => {
                this.logger.info(`远程 WebSocket 适配器已启动，监听端口: ${this.port}`);
                resolve();
            });

            this.wss.on('connection', (ws, req) => {
                // 提取服务器 ID (如果有的话)，否则使用 IP+端口 作为临时 ID
                const urlParams = new URLSearchParams(req.url.split('?')[1]);
                let serverId = urlParams.get('server_id');
                if (!serverId) {
                    const ip = req.socket.remoteAddress.replace('::ffff:', '');
                    serverId = `Server_${ip}_${req.socket.remotePort}`;
                }

                this.logger.info(`[${serverId}] 远程 MC 服务器已连接`);
                this.clients.set(serverId, ws);
                this.emit('server.connected', serverId);

                ws.on('message', (message) => {
                    this.handleIncomingMessage(serverId, ws, message);
                });

                ws.on('close', () => {
                    this.logger.warn(`[${serverId}] 远程 MC 服务器已断开`);
                    this.clients.delete(serverId);
                    this.emit('server.disconnected', serverId);
                });

                ws.on('error', (err) => {
                    this.logger.error(`[${serverId}] 连接异常: ${err.message}`);
                });
            });
        });
    }

    /**
     * 处理收到的原始消息
     */
    handleIncomingMessage(serverId, ws, rawData) {
        try {
            const json = JSON.parse(rawData);

            if (json.type === 'encrypted') {
                // 尝试解密
                const decryptedStr = this.decrypt(json.params.raw);
                if (!decryptedStr) {
                    this.logger.error(`[${serverId}] 解密失败，可能密码不匹配`);
                    // 按照协议，返回明文错误包
                    ws.send(JSON.stringify({ type: 'decodefailed', msg: 'AES decryption failed' }));
                    return;
                }

                // 解密成功，解析内层数据包
                const pack = JSON.parse(decryptedStr);

                // 将解密后的数据包扔给 Core 的事件总线，插件可以通过监听 'server.message' 获取
                this.emit('server.message', serverId, pack);

                // this.logger.debug(`[${serverId}] 收到数据包 action: ${pack.action}`);

            } else {
                this.logger.warn(`[${serverId}] 收到未加密的异常数据包: ${json.type}`);
            }
        } catch (e) {
            this.logger.error(`[${serverId}] 解析外层 JSON 失败: ${e.message}`);
        }
    }

    /**
     * 将数据包装为加密包发送
     */
    _sendEncryptedPack(ws, innerPack) {
        const encryptedRaw = this.encrypt(JSON.stringify(innerPack));
        if (!encryptedRaw) return false;

        const payload = {
            type: "encrypted",
            params: {
                mode: "aes_cbc_pck7padding",
                raw: encryptedRaw
            }
        };

        ws.send(JSON.stringify(payload));
        return true;
    }

    /**
     * 向指定服务器发送指令 (子类实现的抽象方法)
     */
    sendCommand(serverId, cmdStr) {
        const ws = this.clients.get(serverId);
        if (ws && ws.readyState === WebSocket.OPEN) {
            // 构造内层的 pack
            const cmdRequest = {
                type: "pack",
                action: "runcmdrequest",
                params: {
                    cmd: cmdStr,
                    id: Date.now() // 使用时间戳作为唯一标识
                }
            };
            return this._sendEncryptedPack(ws, cmdRequest);
        }
        return false;
    }

    /**
     * 广播指令 (子类实现的抽象方法)
     */
    broadcast(cmdStr) {
        const cmdRequest = {
            type: "pack",
            action: "runcmdrequest",
            params: {
                cmd: cmdStr,
                id: Date.now()
            }
        };

        let count = 0;
        this.clients.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                this._sendEncryptedPack(ws, cmdRequest);
                count++;
            }
        });
        this.logger.info(`已向 ${count} 台在线服务器广播指令。`);
    }
}

module.exports = WSServerAdapter;