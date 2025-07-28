const fs = require('fs').promises;
const path = require('path');
const {getModuleLogger} = require('../services/logger');

class PluginManager {
    /**
     * @param {object} context - 要注入給所有插件的上下文物件。
     * @param {object} configManager - 配置管理器實例。
     */
    constructor(context, configManager) {
        this.pluginsDir = path.join(process.cwd(), 'plugins');
        this.context = context;
        this.configManager = configManager; // 接收配置管理器實例
        this.plugins = new Map(); // 存儲已加載的插件實例 <name, instance>
        this.logger = getModuleLogger('PluginManager');
    }

    /**
     * 掃描插件目錄，並加載所有找到的插件。
     */
    async loadAllPlugins() {
        this.logger.info(`正在從目錄 [${this.pluginsDir}] 掃描插件...`);
        try {
            const pluginFolders = await fs.readdir(this.pluginsDir, { withFileTypes: true });

            for (const folder of pluginFolders) {
                if (folder.isDirectory()) {
                    const pluginName = folder.name;
                    const pluginPath = path.join(this.pluginsDir, pluginName);
                    // 調用核心的 loadPlugin 方法
                    await this.loadPlugin(pluginPath, pluginName);
                }
            }
            // this.configManager.save()
        } catch (error) {
            if (error.code === 'ENOENT') {
                this.logger.warn(`插件目錄 [${this.pluginsDir}] 不存在，將自動創建。`);
                await fs.mkdir(this.pluginsDir, { recursive: true });
            } else {
                this.logger.error('掃描插件目錄時出錯:', error);
            }
        }
    }

    /**
     * 加載單個插件的核心函數。
     * 這是整個插件系統加載流程的關鍵。
     * @param {string} pluginPath - 插件的完整檔案路徑。
     * @param {string} pluginName - 插件的名稱 (即資料夾名稱)。
     */
    async loadPlugin(pluginPath, pluginName) {
        const manifestPath = path.join(pluginPath, 'plugin.json');

        try {
            // 1. 讀取並解析清單文件 (plugin.json)
            const manifestContent = await fs.readFile(manifestPath, 'utf-8');

            const metadata = JSON.parse(manifestContent);


            // 2. 驗證清單文件
            if (metadata.name !== pluginName) {
                this.logger.error(`插件 [${pluginName}] 的 plugin.json 中的名稱 ('${metadata.name}') 與資料夾名稱不匹配，已跳過加載。`);
                return;
            }
            if (this.plugins.has(metadata.name)) {
                this.logger.warn(`插件 [${metadata.name}] 已存在，將跳過重複加載。`);
                return;
            }

            // 3. 加載插件的入口文件，獲取插件類別
            const entryPointPath = path.join(pluginPath, metadata.main || 'index.js');

            const PluginClass = require(entryPointPath);

            // 4. 【核心】與配置管理器交互，為插件註冊配置
            // 我們將插件類別本身傳遞給 ConfigManager，以便它能調用靜態的 defineConfig 方法
            const pluginConfig = this.configManager.registerPlugin(pluginName, PluginClass);

            // 5. 創建專屬於此插件的上下文 (Context)
            // 將通用的上下文與該插件的特定配置實例合併
            const pluginContext = {
                ...this.context,
                config: pluginConfig // 注入配置實例
            };

            // 6. 實例化插件類別
            const pluginInstance = new PluginClass(metadata, pluginContext);
            this.plugins.set(metadata.name, pluginInstance);

            // 7. 調用 onLoad 生命週期鉤子
            if (typeof pluginInstance.onLoad === 'function') {
                pluginInstance.onLoad();
            }

            this.logger.info(`成功加載插件: ${metadata.name} v${metadata.version}`);

        } catch (error) {
            this.logger.error(`加載插件 [${pluginName}] 失敗:`);
            console.error(error)
        }
    }

    /**
     * 啟用所有已加載的插件。
     */
    async enableAllPlugins() {
        this.logger.info(`正在啟用所有 ${this.plugins.size} 個已加載的插件...`);
        for (const name of this.plugins.keys()) {
            await this.enablePlugin(name);
        }
    }

    /**
     * 啟用指定的插件。
     * @param {string} name - 要啟用的插件名稱。
     */
    async enablePlugin(name) {
        const plugin = this.plugins.get(name);
        if (!plugin) {
            this.logger.error(`嘗試啟用一個不存在或未加載的插件: ${name}`);
            return;
        }
        try {
            await plugin.onEnable();
            this.logger.info(`插件 [${name}] 已成功啟用。`);
        } catch (error) {
            this.logger.error(`啟用插件 [${name}] 時出錯:`, error);
        }
    }
}

module.exports = PluginManager;
