const fs = require('fs');
const path = require('path');
const vm = require('node:vm');
const lg = require('../handles/logger');
const fhelper = require('../handles/file');
const logger = lg.getLogger('PluginManager');
const { getLogger } = require('../handles/logger');

// 插件优先级映射表
const PRIORITY_MAP = { post: 0, main: 1, init: 2, base: 3 };

class PluginManager {
    constructor(core) {
        this.core = core;
        this.pluginsDir = path.join(__dirname, '../plugins');
        this.listFile = path.join(this.pluginsDir, 'list.json');

        // 插件状态字典：存放插件的元数据、运行状态等
        // 状态包括: loaded, disabled, crashed, ignored
        // this.pluginsRegistry = {};
        // this.sortedPluginNames = [];
        this.pluginsRegistry = {
            'base': {
                info: {
                    name: 'base',
                    version: '3.0.0',
                    description: 'SparkBridge3 核心配置',
                    author: 'SparkBridge3 Official'
                },
                status: 'loaded', // 核心配置默认即为加载成功
                virtual: true     // 标记为虚拟插件，不执行实际的加载逻辑
            },
            'web':{
                info: {
                    name: 'web',
                    version: '3.0.0',
                    description: 'SparkBridge3 Web控制面板',
                    author: 'SparkBridge3 Official'
                },
                status: 'loaded', // 核心配置默认即为加载成功
                virtual: true     // 标记为虚拟插件，不执行实际的加载逻辑
            }
        };
        this.sortedPluginNames = []; // 确保 base 始终排在列表第一个
    }

    /**
     * 第一步：同步文件夹与 list.json
     * 自动发现新插件，移除已删除插件，并补全默认 spark.json
     */
    // syncPlugins() {
    //     let savedList = [];
    //     if (fs.existsSync(this.listFile)) {
    //         savedList = JSON.parse(fhelper.read(this.listFile) || '[]');
    //     }

    //     const currentFolders = fs.readdirSync(this.pluginsDir).filter(f =>
    //         fs.statSync(path.join(this.pluginsDir, f)).isDirectory()
    //     );

    //     const currentListObj = {};

    //     currentFolders.forEach(folder => {
    //         const sparkJsonPath = path.join(this.pluginsDir, folder, 'spark.json');
    //         if (!fs.existsSync(sparkJsonPath)) return;

    //         let info = JSON.parse(fhelper.read(sparkJsonPath));
    //         let modified = false;

    //         // 补全缺失字段
    //         if (!info.priority) { info.priority = 'post'; modified = true; }
    //         if (!info.permission) { info.permission = 'core'; modified = true; }
    //         if (typeof info.load === 'undefined') { info.load = true; modified = true; }

    //         if (modified) fhelper.writeTo(sparkJsonPath, JSON.stringify(info, null, 2));

    //         const priorityVal = PRIORITY_MAP[info.priority] || 0;
    //         currentListObj[info.name] = { folder, info, priorityVal };
    //     });

    //     // 对比并更新 list.json 逻辑
    //     for (const name in currentListObj) {
    //         const folder = currentListObj[name].folder;
    //         if (!savedList.includes(folder)) {
    //             logger.info(`发现新插件: ${name} (${folder})`);
    //             savedList.push(folder);
    //         }
    //     }
    //     savedList = savedList.filter(folder => currentFolders.includes(folder));

    //     fhelper.writeTo(this.listFile, JSON.stringify(savedList, null, 2));

    //     // 按优先级降序排序
    //     const sortedArray = Object.values(currentListObj).sort((a, b) => b.priorityVal - a.priorityVal);

    //     sortedArray.forEach(item => {
    //         if (item.info.name !== 'base'  && item.info.name !== 'web'){
    //             this.sortedPluginNames.push(item.info.name);
    //             this.pluginsRegistry[item.info.name] = {
    //                 ...item,
    //             status: 'pending' // 初始状态
    //         };
    //         }
            
    //     });

    //     logger.info(`共检测到 ${this.sortedPluginNames.length} 个有效插件`);
    //     this.sortedPluginNames.push("base")
    // }
    syncPlugins() {
        let savedList = [];
        if (fs.existsSync(this.listFile)) {
            savedList = JSON.parse(fhelper.read(this.listFile) || '[]');
        }

        const currentFolders = fs.readdirSync(this.pluginsDir).filter(f =>
            fs.statSync(path.join(this.pluginsDir, f)).isDirectory()
        );

        const currentListObj = {};

        currentFolders.forEach(folder => {
            const sparkJsonPath = path.join(this.pluginsDir, folder, 'spark.json');
            if (!fs.existsSync(sparkJsonPath)) return;

            let info = JSON.parse(fhelper.read(sparkJsonPath));
            let modified = false;

            if (!info.priority) { info.priority = 'post'; modified = true; }
            if (!info.permission) { info.permission = 'core'; modified = true; }
            if (typeof info.load === 'undefined') { info.load = true; modified = true; }

            if (modified) fhelper.writeTo(sparkJsonPath, JSON.stringify(info, null, 2));

            const priorityVal = PRIORITY_MAP[info.priority] || 0;
            currentListObj[info.name] = { folder, info, priorityVal };
        });

        for (const name in currentListObj) {
            const folder = currentListObj[name].folder;
            if (!savedList.includes(folder)) {
                logger.info(`发现新插件: ${name} (${folder})`);
                savedList.push(folder);
            }
        }
        savedList = savedList.filter(folder => currentFolders.includes(folder));

        fhelper.writeTo(this.listFile, JSON.stringify(savedList, null, 2));

        // ==========================================
        // 核心修复区域：处理运行时热重载的状态保留
        // ==========================================

        // 修复 Bug 1: 每次扫描前，先清空排序数组，防止重复 push
        this.sortedPluginNames = [];

        const sortedArray = Object.values(currentListObj).sort((a, b) => b.priorityVal - a.priorityVal);

        sortedArray.forEach(item => {
            if (item.info.name !== 'base' && item.info.name !== 'web') {
                this.sortedPluginNames.push(item.info.name);

                // 修复 Bug 2: 检查内存中是否已经存在该插件
                const existingPlugin = this.pluginsRegistry[item.info.name];

                if (existingPlugin) {
                    // 如果是已经加载的老插件，合并最新配置，但【强制保留原有的运行状态】
                    this.pluginsRegistry[item.info.name] = {
                        ...existingPlugin, // 保留老数据
                        ...item,           // 覆盖新文件夹路径和 info
                        status: existingPlugin.status // 绝对保留 status ('loaded', 'crashed' 等)
                    };
                } else {
                    // 如果是刚下载/拖拽进来的全新插件，才赋予 pending 状态
                    this.pluginsRegistry[item.info.name] = {
                        ...item,
                        status: 'pending'
                    };
                }
            }
        });

        logger.info(`共检测到 ${this.sortedPluginNames.length} 个有效插件`);
        this.sortedPluginNames.push("base");
    }

    /**
     * 第二步：执行加载所有插件virtual
     */
    loadAll() {
        this.syncPlugins();

        logger.info('=== 开始加载插件 ===');
        for (const name of this.sortedPluginNames) {
            if(name !== 'base' && name !== 'web') this.loadSinglePlugin(name);
        }

        // 将加载结果通过 Core 传递给 WebManager 供网页展示
        this.core.emit('plugins.loaded', this.pluginsRegistry);
        logger.info('=== 插件加载完毕 ===');
    }

    /**
     * 加载单个插件 (带崩溃拦截与环境判断)
     */
    loadSinglePlugin(name) {
        const pData = this.pluginsRegistry[name];
        const { info, folder } = pData;

        if (!pData || pData.virtual) return;

        // 1. 检查是否被用户停用
        if (info.load === false) {
            logger.info(`[停用] 跳过加载插件: ${name}`);
            pData.status = 'disabled';
            return;
        }

        // 2. 检查运行环境 (BDS vs Offline)
        const isBDS = global.spark && global.spark.onBDS;
        if (info.loadmode === 'offline' && isBDS) {
            logger.info(`[忽略] ${name} 仅限离线环境使用`);
            pData.status = 'ignored';
            return;
        }
        if (info.loadmode === 'bds' && !isBDS) {
            logger.info(`[忽略] ${name} 仅限 BDS 环境使用`);
            pData.status = 'ignored';
            return;
        }

        // 3. 执行沙盒加载并拦截崩溃
        try {
            if (info.permission === 'core') {
                // Core 权限直接 require，拥有 Node.js 最高权限
                require(path.join(this.pluginsDir, folder));
            } else {
                // Nor / Key 权限使用 VM 沙盒隔离
                this.executeInVM(info.permission, folder, name);
            }
            pData.status = 'loaded';
            logger.info(`[成功] 加载 ${name} (权限: ${info.permission})`);
            // tracker.trackEvent("plugin_load",{name})
        } catch (err) {
            // 崩溃拦截：插件报错不会导致整个 SparkBridge3 崩溃
            pData.status = 'crashed';
            pData.error = err.message;
            console.error(err);
            logger.error(`[崩溃] 插件 ${name} 加载失败: ${err.message}`);
            if (this.core.config.debug) console.log(err.stack);
        }
    }

    /**
     * VM 沙盒执行逻辑
     */
    executeInVM(permission, folder,name) {
        const pkgPath = path.join(this.pluginsDir, folder, 'package.json');
        let mainFile = 'index.js';
        if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            if (pkg.main) mainFile = pkg.main;
        }

        const filePath = path.join(this.pluginsDir, folder, mainFile);
        const code = fs.readFileSync(filePath, 'utf8');

        // 构建上下文，注入核心 API
        const context = this.buildContext(permission, folder, filePath, name);
        const script = new vm.Script(code, { filename: filePath });
        script.runInNewContext(context);
    }

    /**
     * 构建 VM 上下文，注入旧版和新版混合 API
     */
    buildContext(permission, folder, filePath, name) {

        // 获取底层封装好的伪 spark 对象，兼容旧插件
        // const legacySpark = this.core.getLegacyAPI(folder);
        const pluginName = name || folder;
        const legacySpark = this.core.getLegacyAPI(pluginName, folder);
        const pluginLogger = getLogger(pluginName);

        const pluginDir = path.dirname(filePath);
        

        let context = {
            console, setInterval, setTimeout, clearInterval, clearTimeout,
            spark: legacySpark,
            logger: pluginLogger,

            // 【注入点】为沙盒环境提供路径变量
            __dirname: pluginDir,
            // __filename: filePath,

            // 也可以顺便注入 process 的部分功能，方便插件判断环境
            process: {
                cwd: () => process.cwd(),
                platform: process.platform,
                env: { NODE_ENV: process.env.NODE_ENV }
            }
        };

        if (permission === 'key') {
            context.ll = typeof ll !== 'undefined' ? ll : { import: () => { }, exports: () => { } };
            context.mc = typeof mc !== 'undefined' ? mc : {};
            context.require = (moduleName) => {
                const resolvedPath = require.resolve(moduleName, { paths: [path.join(this.pluginsDir, folder)] });
                return require(resolvedPath);
            };
        }
        return context;
    }
}

module.exports = PluginManager;