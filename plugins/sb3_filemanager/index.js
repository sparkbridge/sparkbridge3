const fs = require('fs');
const path = require('path');
const {Buffer} = require("buffer")
// const { v4: uuidv4 } = require('uuid'); // 可选：用于生成唯一文件名

// ========================
// 1. 基础配置
// ========================
// 文件存储根目录（建议使用插件专属目录）
// console.log(__dirname)
let FILE_ROOT = '';
if(spark.onBDS){
    FILE_ROOT =path.join(__dirname, '../../serverdata')
}else{
    FILE_ROOT = path.join(__dirname, '../../testdata')
}
// 初始化存储目录（不存在则创建）
if (!fs.existsSync(FILE_ROOT)) {
    fs.mkdirSync(FILE_ROOT, { recursive: true });
}
spark.web.registerPage("文件管理器","index.html")


// ========================
// 2. 工具函数
// ========================
/**
 * 格式化文件信息
 * @param {string} dirPath 目录路径
 * @param {string} fileName 文件名
 * @returns {Object} 格式化后的文件信息
 */
function formatFileInfo(dirPath, fileName) {
    const fullPath = path.join(dirPath, fileName);
    const stats = fs.statSync(fullPath);

    return {
        name: fileName,
        type: stats.isDirectory() ? 'folder' : 'file',
        path: fullPath.replace(FILE_ROOT, ''), // 相对路径
        size: stats.size,
        modifyTime: stats.mtime.toISOString(),
        createTime: stats.birthtime.toISOString()
    };
}

/**
 * 安全拼接路径（防止路径遍历攻击）
 * @param {string} relativePath 相对路径
 * @returns {string} 安全的绝对路径
 */
function safeJoin(relativePath) {
    // 规范化路径，防止../遍历
    const normalizedPath = path.normalize(relativePath);
    // 拼接根目录
    const fullPath = path.join(FILE_ROOT, normalizedPath);

    // 检查是否在根目录范围内
    if (!fullPath.startsWith(FILE_ROOT)) {
        throw new Error('非法路径访问');
    }

    return fullPath;
}

// ========================
// 3. API 注册（仿照示例风格）
// ========================
/**
 * 获取文件列表
 * 注册路径：/api/plugin/filemanager/list
 */
spark.web.registerApi("GET", "/filemanager/list", (req, res) => {
    try {
        // 获取请求的目录路径（默认根目录）
        const dirPath = req.query.path || '/';
        const fullDirPath = safeJoin(dirPath);

        // 检查目录是否存在
        if (!fs.existsSync(fullDirPath) || !fs.statSync(fullDirPath).isDirectory()) {
            return res.json({ code: 404, message: "目录不存在" });
        }

        // 读取目录内容
        const files = fs.readdirSync(fullDirPath);
        // 格式化文件信息
        const fileList = files.map(file => formatFileInfo(fullDirPath, file));

        res.json({
            code: 200,
            data: fileList,
            currentPath: dirPath
        });
    } catch (error) {
        console.error('获取文件列表失败：', error);
        res.json({ code: 500, message: "获取文件列表失败：" + error.message });
    }
}, false);

/**
 * 读取文件内容
 * 注册路径：/api/plugin/filemanager/read
 */
spark.web.registerApi("GET", "/filemanager/read", (req, res) => {
    try {
        // 获取文件路径
        const filePath = req.query.path;
        if (!filePath) {
            return res.json({ code: 400, message: "文件路径不能为空" });
        }

        const fullFilePath = safeJoin(filePath);

        // 检查文件是否存在且是文件
        if (!fs.existsSync(fullFilePath) || fs.statSync(fullFilePath).isDirectory()) {
            return res.json({ code: 404, message: "文件不存在" });
        }

        // 读取文件内容
        const content = fs.readFileSync(fullFilePath, 'utf8');

        res.json({
            code: 200,
            data: {
                path: filePath,
                content: content,
                size: fs.statSync(fullFilePath).size
            }
        });
    } catch (error) {
        console.error('读取文件失败：', error);
        res.json({ code: 500, message: "读取文件失败：" + error.message });
    }
}, false);

/**
 * 保存文件内容
 * 注册路径：/api/plugin/filemanager/save
 */
spark.web.registerApi("POST", "/filemanager/save", (req, res) => {
    try {
        const { path: filePath, content } = req.body;

        // 参数校验
        if (!filePath || content === undefined) {
            return res.json({ code: 400, message: "文件路径和内容不能为空" });
        }

        const fullFilePath = safeJoin(filePath);

        // 确保目录存在
        const dirName = path.dirname(fullFilePath);
        if (!fs.existsSync(dirName)) {
            fs.mkdirSync(dirName, { recursive: true });
        }

        // 写入文件内容
        fs.writeFileSync(fullFilePath, content, 'utf8');

        // 保存到JSON文件（仿照示例的fileObj.write逻辑）
        // 如果需要持久化配置，可以额外保存文件列表到JSON
        // fileObj.write('filemanager.json', { lastSaveTime: new Date() });

        res.json({
            code: 200,
            message: "文件保存成功",
            data: {
                path: filePath,
                size: Buffer.byteLength(content, 'utf8')
            }
        });
    } catch (error) {
        console.error('保存文件失败：', error);
        res.json({ code: 500, message: "保存文件失败：" + error.message });
    }
}, false);

/**
 * 新建文件夹
 * 注册路径：/api/plugin/filemanager/mkdir
 */
spark.web.registerApi("POST", "/filemanager/mkdir", (req, res) => {
    try {
        const { path: parentPath, name } = req.body;

        // 参数校验
        if (!parentPath || !name) {
            return res.json({ code: 400, message: "父路径和文件夹名称不能为空" });
        }

        // 拼接新文件夹路径
        const newFolderPath = safeJoin(path.join(parentPath, name));

        // 检查文件夹是否已存在
        if (fs.existsSync(newFolderPath)) {
            return res.json({ code: 409, message: "文件夹已存在" });
        }

        // 创建文件夹
        fs.mkdirSync(newFolderPath, { recursive: true });

        res.json({
            code: 200,
            message: "文件夹创建成功",
            data: {
                path: path.join(parentPath, name),
                name: name
            }
        });
    } catch (error) {
        console.error('创建文件夹失败：', error);
        res.json({ code: 500, message: "创建文件夹失败：" + error.message });
    }
}, false);

/**
 * 新建文件
 * 注册路径：/api/plugin/filemanager/touch
 */
spark.web.registerApi("POST", "/filemanager/touch", (req, res) => {
    try {
        const { path: parentPath, name, content = '' } = req.body;

        // 参数校验
        if (!parentPath || !name) {
            return res.json({ code: 400, message: "父路径和文件名称不能为空" });
        }

        // 拼接新文件路径
        const newFilePath = safeJoin(path.join(parentPath, name));

        // 检查文件是否已存在
        if (fs.existsSync(newFilePath)) {
            return res.json({ code: 409, message: "文件已存在" });
        }

        // 确保目录存在
        const dirName = path.dirname(newFilePath);
        if (!fs.existsSync(dirName)) {
            fs.mkdirSync(dirName, { recursive: true });
        }

        // 创建空文件
        fs.writeFileSync(newFilePath, content, 'utf8');

        res.json({
            code: 200,
            message: "文件创建成功",
            data: {
                path: path.join(parentPath, name),
                name: name,
                size: Buffer.byteLength(content, 'utf8')
            }
        });
    } catch (error) {
        console.error('创建文件失败：', error);
        res.json({ code: 500, message: "创建文件失败：" + error.message });
    }
}, false);

// ========================
// 4. 导出模块（可选）
// ========================
const logger = spark.getLogger()
logger.info('✅ SparkBridge3 文件管理器插件后端API注册完成');

