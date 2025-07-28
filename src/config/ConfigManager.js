const fs = require('fs').promises;
const path = require('path');
const PluginConfig = require('./PluginConfig');
const logger = require('../services/logger').getModuleLogger('ConfigManager');

const CONFIG_FILE_PATH = path.join(process.cwd(), 'data', 'plugin_configs.json');

class ConfigManager {
    constructor() {
        this.allConfigs = {}; // 存儲所有插件的原始數據 { pluginName: { key: value } }
        this.pluginConfigInstances = new Map(); // 存儲 PluginConfig 的實例 <pluginName, PluginConfig>
    }

    /**
     * 從文件加載所有插件的配置。
     */
    async load() {
        try {
            const content = await fs.readFile(CONFIG_FILE_PATH, 'utf-8');
            this.allConfigs = JSON.parse(content);
            logger.info(`成功從 [${CONFIG_FILE_PATH}] 加載插件配置。`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                logger.warn(`插件配置文件不存在，將使用空配置。`);
                this.allConfigs = {};
                this.save()
            } else {
                logger.error('加載插件配置文件失敗:', error);
            }
        }
    }

    /**
     * 將所有插件的配置保存到文件。
     */
    async save() {
        try {
            await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(this.allConfigs, null, 2), 'utf-8');
        } catch (error) {
            logger.error('保存插件配置文件失敗:', error);
        }
    }

    registerPlugin(pluginName,PluginClass) {
        // const pluginName = plugin.metadata.name;
        // const PluginClass = plugin.constructor;

        if (typeof PluginClass.defineConfig !== 'function') {
            return null; // 該插件沒有配置
        }

        // 1. 調用 defineConfig 並獲取返回的物件
        const configInfo = PluginClass.defineConfig();
        if (!configInfo || typeof configInfo.schema !== 'object') {
            logger.warn(`插件 [${pluginName}] 的 defineConfig 方法返回了無效的結構，已跳過配置處理。`);
            return null;
        }

        // 2. 從返回的物件中解構出 schema 和 autoRepair 標誌
        const configDefinition = configInfo.schema;
        const autoRepair = configInfo.autoRepair === true; // 預設為 false

        let configChanged = false;

        // 3. 如果存檔中沒有該插件的配置，則使用預設值初始化
        if (!this.allConfigs[pluginName]) {
            this.allConfigs[pluginName] = {};
            for (const key in configDefinition) {
                if (configDefinition[key].value !== undefined) {
                    this.allConfigs[pluginName][key] = configDefinition[key].value;
                }
            }
            configChanged = true;
            logger.info(`插件 [${pluginName}] 的配置不存在，已根據模板創建。`);
        }
        // 4. 如果配置已存在，並且插件選擇了自動修復，則檢查缺失項
        else if (autoRepair) {
            const currentConfig = this.allConfigs[pluginName];
            for (const key in configDefinition) {
                // 如果當前配置中不存在模板中定義的鍵
                if (currentConfig[key] === undefined) {
                    const defaultValue = configDefinition[key].value;
                    currentConfig[key] = defaultValue;
                    configChanged = true;
                    logger.warn(`插件 [${pluginName}] 的配置缺少鍵 [${key}]，已自動補全預設值: ${defaultValue}`);
                }
            }
        }

        // 5. 如果在註冊過程中配置發生了變更（新增或補全），則異步保存一次
        if (configChanged) {
            this.save();
        }

        // 6. 創建並返回配置實例
        const configInstance = new PluginConfig(
            pluginName,
            this.allConfigs[pluginName],
            () => this.save()
        );

        this.pluginConfigInstances.set(pluginName, configInstance);
        return configInstance;
    }

    /**
     * 更新一個插件的配置數據（通常由 API 呼叫）。
     * @param {string} pluginName
     * @param {string} changeK - 配置數據
     * @param {string} value - 配置數據
     */
    async updatePluginConfig(pluginName, changeK,value) {
        if (!this.allConfigs[pluginName]) {
            throw new Error(`找不到插件 [${pluginName}] 的配置。`);
        }

        // 更新內存中的數據
        this.allConfigs[pluginName][changeK] = value;

        // 保存到文件
        await this.save();

        // 通知對應的 PluginConfig 實例數據已更新
        const instance = this.pluginConfigInstances.get(pluginName);
        if (instance) {
            instance._updateData(this.allConfigs[pluginName]);
        }
        logger.info(`插件 [${pluginName}] 的配置已更新。`);
    }

    /**
     * 獲取所有插件的配置定義和當前值，用於提供給前端 API。
     * @param {Map<string, object>} loadedPlugins - 已加載的插件實例 Map。
     * @returns {object}
     */
    getFrontendConfigs(loadedPlugins) {
        const frontendData = {};
        for (const [name, plugin] of loadedPlugins.entries()) {
            if (typeof plugin.constructor.defineConfig === 'function') {
                const definition = plugin.constructor.defineConfig();
                // 將當前值合併到定義中
                const currentValues = this.allConfigs[name] || {};
                for (const key in definition) {
                    if (currentValues[key] !== undefined) {
                        definition[key].value = currentValues[key];
                    }
                }
                frontendData[name] = definition;
            }
        }
        return frontendData;
    }
}

module.exports = ConfigManager;
