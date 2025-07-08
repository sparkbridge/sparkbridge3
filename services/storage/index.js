// src/services/storage/index.js
const LoggerService = require('../../utils/logger');
class StorageService {
    constructor(config) {
        this.logger = new LoggerService('StorageService'); 
        this.adapter = this.loadAdapter(config.adapter, config.options);
        this.logger.info(`存储服务已初始化，适配器: ${config.adapter}`);
    }

    loadAdapter(adapterName) {
        try {
            // 我们的适配器命名为 LocalFsAdapter，所以这里拼接一下
            const adapterClassName = `${adapterName}Adapter`;
            return require(`./adapters/${adapterClassName}.js`);
        } catch (error) {
            console.error(error);
            throw new Error(`Storage adapter "${adapterName}" not found or failed to load.`);
        }
    }

    // 对外暴露与适配器同样的方法
    read(path) {
        this.logger.debug(`尝试读取文件: ${path}`);
        try {
            return this.adapter.read(path);
        } catch (error) {
            this.logger.error(`读取文件失败: ${path}, 错误: ${error.message}`);
            throw error;
        }

    }

    readBinary(path) {
        return this.adapter.readBinary(path);
    }

    write(path, content) {
        return this.adapter.write(path, content);
    }

    exists(path) {
        return this.adapter.exists(path);
    }

    dirExists(path) {
        return this.adapter.dirExists(path);
    }
}

module.exports = StorageService;