const Router = require('koa-router');
const { getModuleLogger } = require('../../services/logger');
const { createSuccessResponse, createErrorResponse } = require('../utils');
const authMiddleware = require('../middleware/auth');
const logger = getModuleLogger('ConfigAPI');
const router = new Router();
router.use(authMiddleware);
/**
 * GET /api/config/all
 * 獲取所有配置數據，用於前端頁面渲染。
 * 數據來源於 MainConfigManager 和 ConfigManager，不再依賴 mockData。
 */
router.get('/all', (ctx) => {
    try {
        // 1. 從 MainConfigManager 獲取主配置的當前狀態
        // ctx.mainConfigManager 是在 app.js 中注入的實例
        const mainConfig = ctx.mainConfigManager.get();

        // 2. 從 ConfigManager 獲取所有插件的配置定義和當前值
        // ctx.pluginManager.plugins 包含了所有已加載的插件實例
        const pluginConfigs = ctx.configManager.getFrontendConfigs(ctx.pluginManager.plugins);

        // 3. 組合最終的數據結構
        const allConfigs = {
            main: mainConfig,
            plugins: pluginConfigs
        };

        ctx.body = createSuccessResponse(allConfigs);
        // logger.info('前端請求了所有整合後的配置數據。');

    } catch (error) {
        logger.error('在獲取所有配置時出錯:', error);
        ctx.status = 500;
        ctx.body = createErrorResponse('獲取配置數據時發生內部錯誤。');
    }
});

/**
 * POST /api/config/update-main
 * 更新主配置。
 * 請求體應為: { "configData": { "telemetry": { "webPort": 3001 }, ... } }
 */
router.post('/update-main', async (ctx) => {
    const { configData } = ctx.request.body;
    if (typeof configData !== 'object' || !configData) {
        ctx.status = 400;
        ctx.body = createErrorResponse('請求格式錯誤，必須提供 configData 物件。');
        return;
    }
    try {
        // 調用 MainConfigManager 的更新方法
        await ctx.mainConfigManager.update(configData);
        ctx.body = createSuccessResponse(null, `主配置已成功更新。`);
    } catch (error) {
        logger.error(`通過 API 更新主配置時失敗:`, { error });
        ctx.status = 500;
        ctx.body = createErrorResponse(error.message || '更新主配置時發生內部錯誤。');
    }
});


/**
 * POST /api/config/update-plugin
 * 更新指定插件的配置。
 * 請求體應為: { "plugin_id": "ping-pong", "configData": { "pong_reply": "new pong!" } }
 */
router.post('/update-plugin', async (ctx) => {
    console.log(ctx.request.body)
    const { plugin_id, changeK, value } = ctx.request.body;

    if (!plugin_id || !changeK || value === undefined) {
        ctx.status = 400;
        ctx.body = createErrorResponse('請求格式錯誤，必須提供 pluginName 和 configData 物件。');
        return;
    }

    try {
        // 調用 ConfigManager 的更新方法，該方法會處理數據更新、保存和通知插件
        await ctx.configManager.updatePluginConfig(plugin_id,changeK,value )
        logger.info(`插件 [${plugin_id}] 的配置已通過 API 更新。`);
        ctx.body = createSuccessResponse(null, `插件 [${plugin_id}] 的配置已成功更新並即時生效。`);

    } catch (error) {
        logger.error(`通過 API 更新插件 [${plugin_id}] 的配置時失敗:`, { error });
        ctx.status = 500;
        ctx.body = createErrorResponse(error.message || '更新插件配置時發生內部錯誤。');
    }
});


module.exports = router;
