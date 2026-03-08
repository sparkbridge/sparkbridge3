const fs = require('fs');
const JSON5 = require('json5');

var PLUGIN_DATA_DIR;
if (typeof mc !== 'undefined') {
    if (!exists('./plugins/LeviLamina')) {
        PLUGIN_DATA_DIR = './plugins/nodejs/sparkbridge3/serverdata';
    } else {
        PLUGIN_DATA_DIR = './plugins/sparkbridge3/serverdata';
    }
} else {
    PLUGIN_DATA_DIR = './testdata';
}

class FileObj {
    constructor(plugin_name) {
        // console.log('[FileObj]', plugin_name);
        this.pname = plugin_name;
        const dirPath = PLUGIN_DATA_DIR + '/' + this.pname;
        if (!exists(dirPath)) {
            mkdir(dirPath);
        }
    }

    // ===================================
    // 兼容老版本的 API
    // ===================================
    initFile(fname, init_obj, autoUpdate = true) {
        let filePath = PLUGIN_DATA_DIR + '/' + this.pname + '/' + fname;
        if (!exists(filePath)) {
            writeTo(filePath, JSON.stringify(init_obj, null, 4));
        } else {
            if (!autoUpdate) return;
            const existingData = JSON.parse(this.read(fname) || "{}");
            let updated = false;
            for (const key in init_obj) {
                if (!(key in existingData)) {
                    existingData[key] = init_obj[key];
                    updated = true;
                }
            }
            if (updated) this.write(fname, existingData);
        }
    }
    getFile(fname) { return this.read(fname); }
    getBuffer(fname) {
        let filePath = PLUGIN_DATA_DIR + '/' + this.pname + '/' + fname;
        if (!exists(filePath)) return null;
        return fs.readFileSync(filePath);
    }
    updateFile(fname, data_obj, json = JSON) { this.write(fname, data_obj, json); }

    // ===================================
    // SparkBridge3 新版的 API
    // ===================================
    read(fname) {
        let filePath = PLUGIN_DATA_DIR + '/' + this.pname + '/' + fname;
        // 【核心修复】：如果文件压根不存在，直接返回 null，不触发底层报错日志
        if (!exists(filePath)) return null;
        return read(filePath);
    }
    write(fname, data_obj, json = JSON) {
        let raw = typeof data_obj === 'string' ? data_obj : json.stringify(data_obj, null, 4);
        writeTo(PLUGIN_DATA_DIR + '/' + this.pname + '/' + fname, raw);
    }
}

// 暴露出全局的工具方法
function exists(pt) {
    try { return fs.existsSync(pt); } catch (e) { return false; }
}
function writeTo(pt, raw) {
    try { fs.writeFileSync(pt, raw, { encoding: 'utf-8' }); } catch (e) { console.log(e); }
}
function mkdir(pt) {
    try { fs.mkdirSync(pt, { recursive: true }); } catch (e) { console.log(e); }
}
function copy(pt, npt) {
    try { fs.copyFileSync(pt, npt); } catch (e) { console.log(e); }
}
function read(pt) {
    try {
        // 【核心修复】：全局读取同样拦截不存在的文件
        if (!fs.existsSync(pt)) return null;
        return fs.readFileSync(pt, { encoding: 'utf-8' });
    } catch (e) {
        console.log(e);
        return null;
    }
}
function listdir(pt) {
    try {
        if (!fs.existsSync(pt)) return [];
        return fs.readdirSync(pt);
    } catch (e) {
        console.log(e);
        return [];
    }
}

module.exports = {
    exists, writeTo, mkdir, copy, read, listdir, FileObj
};