/**
 * 所有插件的基底類別。
 * 用戶編寫的插件應繼承此類別，並實現相應的生命週期方法。
 */
class Plugin {
    /**
     * 插件的元數據，從 plugin.json 中讀取。
     * @type {{name: string, version: string, author: string, description: string}}
     */
    metadata = {};

    /**
     * 插件的上下文物件，由 PluginManager 注入。
     * 包含了插件與主應用程式交互所需的所有 API。
     * @type {object}
     */
    ctx = {};

    /**
     * 插件專用的日誌記錄器。
     * @type {object}
     */
    logger;

    /**
     * 構造函數，由 PluginManager 調用。
     * @param {object} metadata - 插件的元數據。
     * @param {object} context - 注入的上下文物件。
     */
    constructor(metadata, context) {
        this.metadata = metadata;
        this.ctx = context;
        // 從上下文中獲取一個帶有插件名稱前綴的 logger
        this.logger = this.ctx.logger;
    }

    /**
     * 生命週期函數：插件被加載時調用。
     * 通常用於一些不需要等待啟用的初始化操作。
     */
    onLoad() {
        // 可選實現
    }

    /**
     * 生命週期函數：插件被啟用時調用。
     * 這是插件的核心，應該在這裡註冊事件監聽器、命令等。
     * @returns {Promise<void> | void}
     */
    async onEnable() {
        // 應由子類實現
    }

    /**
     * 生命週期函數：插件被停用時調用。
     * 應該在這裡清理所有已註冊的監聽器和資源。
     * @returns {Promise<void> | void}
     */
    async onDisable() {
        // 可選實現
    }
}

module.exports = Plugin;
