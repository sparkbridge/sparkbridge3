const { EventEmitter } = require('events');

/**
 * 代表單個插件的配置實例。
 * 它是一個事件發射器，當配置被更新時會發出通知。
 */
class PluginConfig extends EventEmitter {
    /**
     * @param {string} pluginName - 插件名稱
     * @param {object} initialData - 該插件的初始配置數據 { key: value, ... }
     * @param {function} saveDataCallback - 一個用於保存所有配置到文件的回調函數
     */
    constructor(pluginName, initialData = {}, saveDataCallback) {
        super();
        this.pluginName = pluginName;
        this.configData = initialData;
        this.saveData = saveDataCallback;
    }

    /**
     * 獲取一個配置項的值。
     * @param {string} key - 配置項的鍵。
     * @param {any} [defaultValue] - 如果鍵不存在時返回的預設值。
     * @returns {any}
     */
    get(key, defaultValue = undefined) {
        return this.configData[key] ?? defaultValue;
    }

    /**
     * 設置一個配置項的值，並觸發保存。
     * @param {string} key - 配置項的鍵。
     * @param {any} value - 新的值。
     */
    async set(key, value) {
        const oldValue = this.configData[key];
        this.configData[key] = value;
        // 觸發保存
        await this.saveData();
        // 發射更新事件，通知插件
        this.emit('update', key, value, oldValue);
    }

    /**
     * 由 ConfigManager 在外部更新數據時調用。
     * @param {object} newData - 最新的完整配置數據。
     * @internal
     */
    _updateData(newData) {
        const oldData = { ...this.configData };
        this.configData = newData;

        // 檢查哪些鍵被更改了，並逐個發射事件
        for (const key in newData) {
            if (newData[key] !== oldData[key]) {
                this.emit('update', key, newData[key], oldData[key]);
            }
        }
    }

    /**
     * 獲取所有配置數據的副本。
     * @returns {object}
     */
    getAll() {
        return { ...this.configData };
    }
}

module.exports = PluginConfig;
