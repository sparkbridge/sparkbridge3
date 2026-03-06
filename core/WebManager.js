const express = require('express');
const cors = require('cors');
const lg = require('../handles/logger');
const logger = lg.getLogger('WebManager');
const path = require('path');
const { FileObj } = require('../handles/file'); // 引入文件操作类
// 导入路由模块
const authRoutes = require('./routes/auth');
const pluginRoutes = require('./routes/plugin');
const overviewRoutes = require('./routes/overview');


class WebManager {
    constructor(core) {
        this.core = core;
        this.app = express();

        console.log(__dirname)

        this.app.use(express.static(path.join(__dirname, '../web')));

       

        // 使用独立的 web 文件夹管理配置
        this.fileHelper = new FileObj('web');
        this.fileHelper.initFile("config.json", {
            admin_password: '*',
            jwt_secret: 'SparkBridge3_Default_Secret',
            host: "127.0.0.1",
            port: 3000
        })
        this.config = JSON.parse(this.fileHelper.read('config.json') || '{}');

        // 初始化从配置文件读取的参数
        this.host = this.config.host || '0.0.0.0';
        this.port = this.config.port || 3000;
        this.adminPassword = this.config.admin_password || 'admin';
        this.jwtSecret = this.config.jwt_secret || 'SparkBridge3_Default_Secret';

        this.customPages = [];
        this.pluginsConfigSchema = {};

        this._initMiddleware();
        this._initStatic();
        this._initCustoms();
        this._initRoutes();
    }

    _initStatic() {
        // 关键：将 plugins 目录映射为静态资源
        // 这样插件里的 web/index.html 就可以通过 http://localhost:port/plugin-views/插件名/web/index.html 访问
        // console.log(path.join(__dirname, '../plugins'))
        this.app.use('/plugin-views', express.static(path.join(__dirname, '../plugins')));

    }

    _initCustoms(){
        this.app.get('/api/custom_pages', this.requireAuth, (req, res) => {
            res.json({
                code: 200,
                data: this.customPages
            });
        });
    }



    _initMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());

        // 鉴权中间件挂载到类实例上，供外部路由使用
        this.requireAuth = (req, res, next) => {
            const jwt = require('jsonwebtoken');
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];

            if (!token) return res.status(401).json({ code: 401, msg: '未登录' });

            jwt.verify(token, this.jwtSecret, (err, user) => {
                if (err) return res.status(403).json({ code: 403, msg: 'Token 已失效' });
                req.user = user;
                next();
            });
        };
    }

    _initRoutes() {
        // 注入 WebManager 实例到路由中
        this.app.use('/api/auth', authRoutes(this));
        this.app.use('/api/plugins', pluginRoutes(this));
        this.app.use('/api/overview', overviewRoutes(this));
    }
    generateRandomString(length) {
        var result = '';
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }


    start() {
        if (this.adminPassword == "*") {
            this.mixpassword = this.generateRandomString(8);
            logger.info(`生成随机密码: ${this.mixpassword}`)
        }
        // 2. 解决Vue History路由模式的404问题（关键）
        // 所有未匹配到接口的请求，都返回Vue的index.html
        // this.app.get(/^\/.*/, (req, res) => {
        //     res.sendFile(path.join(__dirname, 'web', 'index.html'));
        // });
        this.app.listen(this.port, this.host, () => {
            logger.info(`Web 控制面板已启动: http://${this.host === '0.0.0.0' ? '127.0.0.1' : this.host}:${this.port}`);
        });
    }

    // 供插件动态调用的 API
    registerApi(method, path, handler, needAuth = true) {
        // console.log(`[Web] 注册 API: ${method} ${path}`);
        const fullPath = `/api/plugin${path.startsWith('/') ? path : '/' + path}`;
        if (needAuth) {
            this.app[method.toLowerCase()](fullPath, this.requireAuth, handler);
        } else {
            this.app[method.toLowerCase()](fullPath, handler);
        }
    }

    registerConfig(configBuilder) {
        // 这里的 configBuilder 就是你在 SparkCore 里构建的 schema 对象
        this.pluginsConfigSchema[configBuilder.name] = {
            name: configBuilder.name,
            items: configBuilder.items // 包含 type, key, val, desc 等
        };

        logger.info(`[Web] 已注册插件配置表单: ${configBuilder.name}`);
    }

    registerCustomPage(pluginName, title, relativePath) {
        const fullPath = `/plugin-views/${pluginName}/${relativePath}`;
        if (!this.customPages.find(p => p.url === fullPath)) {
            this.customPages.push({
                id: `${pluginName}_${Date.now()}`,
                pluginName,
                title,
                url: fullPath
            });
            logger.info(`[Web] 已挂载插件自定义页面: [${pluginName}] ${title}`);
        }
    }
}

module.exports = WebManager;