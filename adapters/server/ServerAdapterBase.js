// adapters/server/ServerAdapterBase.js
const EventEmitter = require('events');
const { getLogger } = require('../../handles/logger');

class ServerAdapterBase extends EventEmitter {
    constructor(adapterName) {
        super();
        this.adapterName = adapterName;
        this.logger = getLogger(`ServerAdapter-${adapterName}`);
    }

    /**
     * 启动连接或初始化监听
     * 子类必须重写此方法
     */
    async connect() {
        throw new Error(`[${this.adapterName}] 必须实现 connect() 方法`);
    }

    /**
     * 向指定服务器发送控制台指令
     * @param {string} serverId 目标服务器ID
     * @param {string} cmdStr 指令文本
     * @returns {boolean} 是否发送成功
     */
    sendCommand(serverId, cmdStr) {
        throw new Error(`[${this.adapterName}] 必须实现 sendCommand() 方法`);
    }

    /**
     * 向该适配器下的所有服务器广播指令
     * @param {string} cmdStr 指令文本
     */
    broadcast(cmdStr) {
        throw new Error(`[${this.adapterName}] 必须实现 broadcast() 方法`);
    }
}

module.exports = ServerAdapterBase;