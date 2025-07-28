const Router = require('koa-router');
const { getModuleLogger } = require('../../services/logger');

const logger = getModuleLogger('PluginMarket');
const mock = require('../../data/mockData');
const { createSuccessResponse, createErrorResponse } = require('../utils');

const router = new Router();

// GET /api/plugins
router.get('/', (ctx) => {
    // 每次請求時，都檢查一下是否有正在安裝的插件，並更新其狀態
    const currentPlugins = mock.mockPluginsDB.map(p => {
        const status = mock.installationStatus[p.id];
        if (status) {
            return { ...p, status };
        }
        return p;
    });
    ctx.body = createSuccessResponse(currentPlugins);
});

// POST /api/plugins/download
router.post('/download', (ctx) => {
    const { pluginId } = ctx.request.body;
    if (!pluginId) {
        ctx.status = 400;
        ctx.body = createErrorResponse('缺少 pluginId');
        return;
    }

    logger.info(`后端开始处理安装插件: ${pluginId}`);
    mock.installationStatus[pluginId] = 'installing';

    // 模擬長時間安裝過程
    setTimeout(() => {
        const plugin = mock.mockPluginsDB.find(p => p.id === pluginId);
        if (plugin) {
            mock.installationStatus[pluginId] = 'installed';
            plugin.status = 'installed';
            logger.info(`后端完成安装插件: ${pluginId}`);
        }
    }, 5000);

    ctx.body = createSuccessResponse({ pluginId }, '已开始安装任务，请稍后查询状态');
});

// GET /api/plugins/status/:pluginId
router.get('/status/:pluginId', (ctx) => {
    const { pluginId } = ctx.params;
    const plugin = mock.mockPluginsDB.find(p => p.id === pluginId);
    if (!plugin) {
        ctx.status = 404;
        ctx.body = createErrorResponse('未找到該插件');
        return;
    }
    const status = mock.installationStatus[pluginId] || plugin.status;
    ctx.body = createSuccessResponse({ status });
});

// POST /api/plugins/uninstall
router.post('/uninstall', (ctx) => {
    const { pluginId } = ctx.request.body;
    const plugin = mock.mockPluginsDB.find(p => p.id === pluginId);

    if (plugin) {
        plugin.status = 'not_installed';
        delete mock.installationStatus[pluginId];
        logger.info(`插件 [${pluginId}] 已成功卸载`);
        ctx.body = createSuccessResponse(null, `插件 [${pluginId}] 已成功卸载`);
    } else {
        ctx.status = 404;
        ctx.body = createErrorResponse('插件未找到');
    }
});


module.exports = router;