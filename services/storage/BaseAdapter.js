// src/services/storage/BaseAdapter.js

class BaseAdapter {
    /**
     * 以UTF-8编码读取文本文件
     * @param {string} path 文件路径
     * @returns {Promise<string>} 文件内容
     */
    async read(path) {
        throw new Error('Adapter must implement the "read" method.');
    }

    /**
     * 读取二进制文件
     * @param {string} path 文件路径
     * @returns {Promise<Buffer>} 文件的二进制 Buffer
     */
    async readBinary(path) {
        throw new Error('Adapter 必须实现 “readBinary” 方法。');
    }

    /**
     * 写入文件
     * @param {string} path 文件路径
     * @param {string|Buffer} content 文件内容
     * @returns {Promise<void>}
     */
    async write(path, content) {
        throw new Error('Adapter 必须实现 “write” 方法。');
    }

    /**
     * 检查文件是否存在
     * @param {string} path 文件路径
     * @returns {Promise<boolean>}
     */
    async exists(path) {
        throw new Error('Adapter 必须实现 "exists" 方法.');
    }

    /**
     * 检查文件夹是否存在
     * @param {string} path 文件夹路径
     * @returns {Promise<boolean>}
     */
    async dirExists(path) {
        throw new Error('Adapter must implement the "dirExists" method.');
    }
}

module.exports = BaseAdapter;