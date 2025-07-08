// src/services/storage/adapters/LocalFsAdapter.js

const fs = require('fs/promises');
const path = require('path');
const BaseAdapter = require('../BaseAdapter');

class LocalFsAdapter extends BaseAdapter {
    constructor(options = {}) {
        super();
        // 可以传入一个根目录，所有操作都相对于这个目录
        this.basePath = options.basePath || process.cwd();
        console.log(`LocalFsAdapter initialized with base path: ${this.basePath}`);
    }

    // 辅助函数，获取绝对路径
    _resolvePath(filePath) {
        return path.resolve(this.basePath, filePath);
    }

    async read(filePath) {
        const absolutePath = this._resolvePath(filePath);
        return fs.readFile(absolutePath, 'utf8');
    }

    async readBinary(filePath) {
        const absolutePath = this._resolvePath(filePath);
        return fs.readFile(absolutePath);
    }

    async write(filePath, content) {
        const absolutePath = this._resolvePath(filePath);
        // 写入前，确保目标文件夹存在
        const dir = path.dirname(absolutePath);
        await fs.mkdir(dir, { recursive: true });
        return fs.writeFile(absolutePath, content);
    }

    async _checkExists(filePath, type = 'file') {
        const absolutePath = this._resolvePath(filePath);
        try {
            const stats = await fs.stat(absolutePath);
            return type === 'file' ? stats.isFile() : stats.isDirectory();
        } catch (error) {
            // 如果错误是'ENOENT' (Error NO ENTry)，说明文件或目录不存在
            if (error.code === 'ENOENT') {
                return false;
            }
            // 其他错误则向上抛出
            throw error;
        }
    }

    async exists(filePath) {
        return this._checkExists(filePath, 'file');
    }

    async dirExists(dirPath) {
        return this._checkExists(dirPath, 'directory');
    }
}

module.exports = LocalFsAdapter;