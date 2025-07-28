const fs = require('fs').promises;
const path = require('path');
const { awa } = require('../services/reconnect');
const logger = require('../services/logger').getModuleLogger('MainConfig');
// 引入 mockData 僅作為首次創建文件時的預設值來源
const  global_config = {
    server:{
        port: 3000
    },
    users: {
        allowReg: true,
        list: [
            {
                username: "admin",
                password: "cGFzc3dvcmQxMjM="
            }
        ]
    },
    JWT_SECRET:'901ec70d7458b84dd016d2974ff0b1c6'
};

const CONFIG_FILE_PATH = path.join(process.cwd(), 'data', 'main_config.json');


async function ensureDir(dirPath) {
    try {
        await fs.access(dirPath);          // 判断是否存在
    } catch (err) {
        if (err.code === 'ENOENT') {       // 不存在就创建
            await fs.mkdir(dirPath, { recursive: true });
        } else {
            throw err;                       // 其他错误继续抛出
        }
    }
}

(async () => {
    const dir = path.join(process.cwd(), 'data');
    await ensureDir(dir);
})();

/**
 * 負責管理主配置文件 (main_config.json)
 */
class MainConfigManager {
    constructor() {
        this.config = {};
    }

    /**
     * 從文件加載主配置。如果文件不存在，則使用 mockData 中的預設值創建。
     */
    async load() {
        try {
            const content = await fs.readFile(CONFIG_FILE_PATH, 'utf-8');
            this.config = JSON.parse(content);
            logger.info(`成功從 [${CONFIG_FILE_PATH}] 加載主配置。`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                logger.warn(`主配置文件不存在，將使用預設值創建。`);
                // 使用 mockData 中的 global_config.data 作為預設結構
                this.config = global_config;
                await this.save();
            } else {
                logger.error('加載主配置文件失敗:', error);
                // 在加載失敗時也使用預設值，以保證程式穩定性
                this.config = global_config;
            }
        }
    }

    /**
     * 將當前的主配置保存到文件。
     */
    async save() {
        try {
            await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(this.config, null, 2), 'utf-8');
        } catch (error) {
            logger.error('保存主配置文件失敗:', error);
        }
    }

    /**
     * 獲取當前所有的主配置數據。
     * @returns {object}
     */
    get() {
        return this.config;
    }

    get(pluginName){
        return this.config[pluginName];
    }

    async update(pluginName, changeK,value){
        if(this.config[pluginName]){
            if(this.config[pluginName][changeK]){
                this.config[pluginName][changeK] = value;
                await this.save();
                this.logger.info(`插件 ${pluginName} 的配置 ${changeK} 已更新為 ${value}`);
            }
        }
    }

    /**
     * 更新主配置數據並保存。
     * @param {object} newConfigData - 新的配置數據，將與現有配置合併。
     */
    async update(newConfigData) {
        // 這裡需要一個深度合併的邏輯，以防只更新了某個子項
        for (const category in newConfigData) {
            if (this.config[category]) {
                this.config[category] = { ...this.config[category], ...newConfigData[category] };
            } else {
                this.config[category] = newConfigData[category];
            }
        }
        await this.save();
        logger.info('主配置已更新並保存。');
    }
}

module.exports = MainConfigManager;
