const express = require('express');
const multer = require('multer');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
// ==========================================
// 全局任务状态机 (保存在内存中)
// ==========================================
const taskState = {
    isBusy: false,
    currentTask: null, // 当前正在执行的任务
    lastTask: null     // 上一次执行完成/失败的任务记录
};

/**
 * 比较新旧版本号，判断新版本是否严格大于旧版本
 * 支持字符串 '1.2.3' 或 数组 [1, 2, 3] 格式，支持长度不对等的比对（如 1.2.0 和 1.2）
 * @param {string|Array} newVer 上传的新版本
 * @param {string|Array} oldVer 本地已安装的旧版本
 * @returns {boolean} 新版本是否高于旧版本
 */
function isVersionGreater(newVer, oldVer) {
    // 统一转为用点分隔的字符串，再分割为数字数组
    const normalize = (v) => (Array.isArray(v) ? v.join('.') : String(v)).replace(/[^0-9.]/g, '');

    const v1 = normalize(newVer).split('.').map(Number);
    const v2 = normalize(oldVer).split('.').map(Number);

    const len = Math.max(v1.length, v2.length);
    for (let i = 0; i < len; i++) {
        const num1 = v1[i] || 0; // 不足的位数补 0
        const num2 = v2[i] || 0;
        if (num1 > num2) return true;
        if (num1 < num2) return false;
    }

    return false; // 如果完全相等，返回 false (必须严格大于才允许安装)
}

module.exports = (webManager) => {
    const router = express.Router();

    // 目录配置
    const PLUGINS_DIR = path.join(__dirname, '../../plugins');
    const TEMP_DIR = path.join(__dirname, '../../temp');

    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

    // 配置 multer，临时存放到 TEMP_DIR
    const upload = multer({ dest: TEMP_DIR });

    // ==========================================
    // 异步后台任务处理器 (核心逻辑)
    // ==========================================
    async function processPluginTask(taskId, zipFilePath) {
        const extractDir = path.join(TEMP_DIR, `ext_${taskId}`);


        try {
            // 1. 解压阶段
            taskState.currentTask.status = 'extracting';
            taskState.currentTask.msg = '正在解压压缩包...';
            taskState.currentTask.progress = 20;

            // 为了不完全阻塞主线程，可以适当加入微小延迟模拟异步进度
            await new Promise(resolve => setTimeout(resolve, 500));

            const zip = new AdmZip(zipFilePath);
            zip.extractAllTo(extractDir, true);

            // 2. 校验阶段
            taskState.currentTask.status = 'validating';
            taskState.currentTask.msg = '正在校验插件清单与合法性...';
            taskState.currentTask.progress = 50;
            await new Promise(resolve => setTimeout(resolve, 500));

            let pluginRootDir = extractDir;
            let pkgPath = path.join(pluginRootDir, 'spark.json');

            // 自动向下寻找一层目录
            if (!fs.existsSync(pkgPath)) {
                const subItems = fs.readdirSync(extractDir);
                if (subItems.length === 1 && fs.statSync(path.join(extractDir, subItems[0])).isDirectory()) {
                    pluginRootDir = path.join(extractDir, subItems[0]);
                    pkgPath = path.join(pluginRootDir, 'spark.json');
                }
            }

            if (!fs.existsSync(pkgPath)) throw new Error('无效的插件包：未找到 spark.json');
            if (!fs.existsSync(path.join(pluginRootDir, 'index.js'))) throw new Error('无效的插件包：缺少核心文件 index.js');

            const pkgInfo = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            const pluginName = pkgInfo.name;
            const pluginVersion = pkgInfo.version;

            if (!pluginName || !pluginVersion) throw new Error('清单错误：缺少 name 或 version 字段');
            if (!/^[a-zA-Z0-9_-]+$/.test(pluginName)) throw new Error('命名不规范：名称只能包含字母、数字和下划线');

            // ==========================================
            // 新增核心逻辑：本地已安装版本校验
            // ==========================================
            // 安全获取注册表
            const registry = webManager?.core?.pluginManager?.pluginsRegistry || {};

            // 如果本地已存在该插件，则执行版本比对
            if (registry[pluginName]) {
                const existingPlugin = registry[pluginName];
                const existingVersion = existingPlugin.info.version;

                // 调用版本比对函数
                if (!isVersionGreater(pluginVersion, existingVersion)) {
                    // 为了提示更友好，把数组形式的版本转回字符串
                    const oldVerStr = Array.isArray(existingVersion) ? existingVersion.join('.') : existingVersion;
                    const newVerStr = Array.isArray(pluginVersion) ? pluginVersion.join('.') : pluginVersion;

                    // 抛出错误，直接阻断后续安装，并记录到 task 的 errorDetail 中
                    throw new Error(`版本过低：本地已安装 v${oldVerStr}，上传版本为 v${newVerStr}，请提供更高版本`);
                }
            }

            // 3. 安装阶段
            taskState.currentTask.status = 'installing';
            taskState.currentTask.msg = '正在部署文件到系统目录...';
            taskState.currentTask.progress = 80;
            await new Promise(resolve => setTimeout(resolve, 500));

            const targetPluginDir = path.join(PLUGINS_DIR, pluginName);

            // 覆盖旧版本
            if (fs.existsSync(targetPluginDir)) {
                fs.rmSync(targetPluginDir, { recursive: true, force: true });
            }
            fs.renameSync(pluginRootDir, targetPluginDir);

            // 4. 成功结束
            taskState.currentTask.status = 'success';
            taskState.currentTask.msg = '安装完成';
            taskState.currentTask.progress = 100;
            taskState.currentTask.plugin = { name: pluginName, version: pluginVersion };

            // 【触发热加载】
            if (webManager?.core?.pluginManager) {
                try {
                    const pm = webManager.core.pluginManager;

                    // 1. 重新扫描目录，将新插件的信息装载到 pluginsRegistry 中
                    pm.syncPlugins();

                    // 2. 执行加载逻辑
                    pm.loadSinglePlugin(pluginName);

                    // 3. 触发全局事件，通知 Web 前端或其他模块注册表已更新，方便页面刷新数据
                    webManager.core.emit('plugins.loaded', pm.pluginsRegistry);

                    console.log(`[插件安装] 插件 ${pluginName} 已成功热加载并运行`);
                } catch (loadErr) {
                    console.error(`[插件安装] 插件 ${pluginName} 文件已部署，但热加载失败:`, loadErr);
                    // 可以选择在这里把错误信息追加给前端
                    taskState.currentTask.msg = '安装完成，但热加载失败';
                }
            }

        } catch (error) {
            console.error(`[插件任务 ${taskId} 失败]`, error.message);
            taskState.currentTask.status = 'error';
            taskState.currentTask.msg = '执行失败';
            taskState.currentTask.errorDetail = error.message;
        } finally {
            // 5. 终极清理：删除临时文件
            try {
                if (fs.existsSync(zipFilePath)) fs.unlinkSync(zipFilePath);
                if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
            } catch (cleanupErr) {
                console.error(`[插件任务 ${taskId} 清理失败]`, cleanupErr.message);
            }

            // 6. 重置系统状态，释放并发锁
            taskState.lastTask = { ...taskState.currentTask }; // 归档到历史记录
            taskState.currentTask = null;
            taskState.isBusy = false;
        }
    }

    // ==========================================
    // 接口 1: 提交插件上传任务
    // ==========================================
    router.post('/task/upload', webManager.requireAuth, upload.single('pluginFile'), (req, res) => {
        // 触发并发锁拦截
        if (taskState.isBusy) {
            if (req.file) fs.unlinkSync(req.file.path); // 拒绝服务时也要删掉刚传的垃圾文件
            return res.json({
                code: 409,
                msg: "当前已有插件正在安装，请等待完成后再试",
                data: { runningTaskId: taskState.currentTask?.taskId }
            });
        }

        if (!req.file) {
            return res.json({ code: 400, msg: '未接收到插件文件' });
        }

        // 创建新任务
        const taskId = `task_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        taskState.isBusy = true;
        taskState.currentTask = {
            taskId: taskId,
            status: 'extracting',
            msg: '已加入后台安装队列...',
            progress: 0,
            errorDetail: '',
            plugin: null
        };

        // 立即给前端返回任务ID (不等待 processPluginTask 执行完毕)
        res.json({
            code: 200,
            msg: "文件上传成功，已加入后台安装队列",
            data: { taskId: taskId }
        });

        // 开启后台异步执行流
        processPluginTask(taskId, req.file.path);
    });

    // ==========================================
    // 接口 2: 轮询获取特定任务进度
    // ==========================================
    router.get('/task/status/:taskId', webManager.requireAuth, (req, res) => {
        const queryTaskId = req.params.taskId;

        // 优先去当前任务里找
        if (taskState.currentTask && taskState.currentTask.taskId === queryTaskId) {
            return res.json({
                code: 200,
                msg: taskState.currentTask.msg,
                data: taskState.currentTask
            });
        }

        // 如果当前没有，去上一次的历史记录里找（说明任务已经结束了）
        if (taskState.lastTask && taskState.lastTask.taskId === queryTaskId) {
            return res.json({
                code: 200,
                msg: taskState.lastTask.msg,
                data: taskState.lastTask
            });
        }

        // 找不到任务
        res.json({ code: 404, msg: '未找到该任务信息或任务已过期' });
    });

    // ==========================================
    // 接口 3: 获取全局当前/最新任务状态
    // ==========================================
    router.get('/task/current', webManager.requireAuth, (req, res) => {
        res.json({
            code: 200,
            msg: taskState.isBusy ? "系统正在执行任务" : "系统空闲",
            data: {
                isBusy: taskState.isBusy,
                currentTask: taskState.currentTask,
                lastTask: taskState.lastTask
            }
        });
    });

    router.post('/task/download', webManager.requireAuth, async (req, res) => {
        // 触发并发锁拦截
        if (taskState.isBusy) {
            return res.json({
                code: 409,
                msg: "当前已有插件正在安装，请等待完成后再试",
                data: { runningTaskId: taskState.currentTask?.taskId }
            });
        }

        const downloadUrl = req.body.url;
        if (!downloadUrl || !downloadUrl.startsWith('http')) {
            return res.json({ code: 400, msg: '请提供有效的插件下载链接' });
        }

        // 创建新任务
        const taskId = `task_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const tempZipPath = path.join(TEMP_DIR, `${taskId}.zip`);

        taskState.isBusy = true;
        taskState.currentTask = {
            taskId: taskId,
            status: 'downloading', // 新增一个专属的下载状态
            msg: '正在从网络下载插件包...',
            progress: 0,
            errorDetail: '',
            plugin: null
        };

        // 立即给前端返回任务ID，前端开始轮询
        res.json({
            code: 200,
            msg: "已加入后台下载与安装队列",
            data: { taskId: taskId }
        });

        // 开启后台异步下载流
        try {
            // 使用 axios 下载文件流
            const response = await axios({
                method: 'GET',
                url: downloadUrl,
                responseType: 'stream',
                timeout: 30000 // 设置 30 秒超时
            });

            const writer = fs.createWriteStream(tempZipPath);
            response.data.pipe(writer);

            // 监听下载完成事件
            writer.on('finish', () => {
                // 下载完成后，无缝衔接之前的解压、校验、安装核心逻辑！
                processPluginTask(taskId, tempZipPath);
            });

            // 监听写入文件错误
            writer.on('error', (err) => {
                throw new Error(`文件写入失败: ${err.message}`);
            });

        } catch (error) {
            console.error(`[插件任务 ${taskId} 下载失败]`, error.message);
            taskState.currentTask.status = 'error';
            taskState.currentTask.msg = '网络下载失败';
            taskState.currentTask.errorDetail = error.message;

            // 清理状态和临时文件
            if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);
            taskState.lastTask = { ...taskState.currentTask };
            taskState.currentTask = null;
            taskState.isBusy = false;
        }
    });

    return router;
};