const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const koaStatic = require('koa-static');
const cors = require('@koa/cors');
const send = require('koa-send');
const path = require('path');

const RulesEngine = require('./engine/engine');

const { logger } = require('./services/logger');
const apiRouter = require('./api');
const OneBot_WsClientAdapter = require('./adapters/v11/client');

const PluginManager = require('./plugins/PluginManager');
const ConfigManager = require('./config/ConfigManager');
const MainConfigManager = require('./config/MainConfigManager');

const app = new Koa();
const PORT = process.env.PORT || 3000; // 您可以修改為您需要的端口
const STATIC_ROOT = path.join(__dirname, '..', 'dist');

// --- 中间件 ---

// 1. 全局错误处理
app.use(async (ctx, next) => {
    try {
        await next();
    } catch (err) {
        logger.error('服务器内部错误', { error: err.stack });
        ctx.status = err.status || 500;
        ctx.body = {
            code: -1,
            message: err.message || '服务器内部错误'
        };
    }
});

// 2. 跨域处理
app.use(cors());

// 3. 请求体解析
app.use(bodyParser());

// 4. 请求日志
app.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    // logger.info(`${ctx.method} ${ctx.url} - ${ms}ms`, { status: ctx.status });
});

// 5. API 路由
app.use(apiRouter.routes()).use(apiRouter.allowedMethods());

// 6. 静态文件服务
app.use(koaStatic(STATIC_ROOT));

// 7. SPA (单页应用) 回退: 任何未匹配到 API 或静态文件的请求都返回 index.html
app.use(async (ctx) => {
    // 如果请求不是以 /api 开头，则认为是前端路由
    if (!ctx.path.startsWith('/api')) {
        await send(ctx, 'index.html', { root: STATIC_ROOT });
    }
});

async function startServer() {
    const mainConfigManager = new MainConfigManager();
    await mainConfigManager.load();

    const configManager = new ConfigManager();
    await configManager.load();

    // 1. 初始化核心服務
    const adapter = new OneBot_WsClientAdapter('ws://192.168.1.17:8081', '123456789');
    const engine = new RulesEngine();
    await engine.initialize(adapter);

    // 2. 創建插件上下文 (Context)
    // 這是主應用與插件之間溝通的橋樑
    const pluginContext = {
        app,         // 允許插件註冊新的 Koa 路由
        adapter,     // 允許插件使用機器人適配器
        engine,      // 允許插件與規則引擎交互
        logger,      // 允許插件創建自己的日誌記錄器
    };

    // 3. 初始化並運行插件管理器
    const pluginManager = new PluginManager(pluginContext, configManager);
    await pluginManager.loadAllPlugins()
    await pluginManager.enableAllPlugins();

    // 4. 將核心服務注入到 Koa 上下文
    app.context.engine = engine;
    app.context.adapter = adapter;

    app.context.mainConfigManager = mainConfigManager;
    app.context.configManager = configManager;
    app.context.pluginManager = pluginManager;

    // ... 註冊 Koa 中介軟體和路由 ...

    // 5. 啟動適配器和 Koa 伺服器
    adapter.start();
    app.listen(mainConfigManager.get('server'), () => {
        logger.info(`Koa 应用已启动，正在监听 http://localhost:${PORT}`, { module: 'Bootstrap' });
    });
}

startServer()