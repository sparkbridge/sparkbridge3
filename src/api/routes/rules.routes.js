const Router = require('koa-router');
const { getModuleLogger } = require('../../services/logger');
const { createSuccessResponse } = require('../utils');
const { loadDataFromFile, saveDataToFile } = require('../../engine/services/variable.service');

const logger = getModuleLogger('RulesAPI');
const router = new Router();

// ... GET /data 路由保持不變 ...

router.post('/', async (ctx) => {
    const newRules = ctx.request.body;
    const currentData = await loadDataFromFile();

    // 1. 保存到檔案
    await saveDataToFile({ ...currentData, rules: newRules });
    logger.info('规则已保存到文件', { rule_count: newRules.length });

    // 2. 【核心】通知正在運行的引擎實例熱加載
    try {
        await ctx.engine.reload();
        logger.info('规则引擎已成功熱加載');
        ctx.body = createSuccessResponse(null, '规则保存并已即時生效');
    } catch (error) {
        logger.error('熱加載规则失败', { error });
        ctx.status = 500;
        ctx.body = createErrorResponse('规则已保存，但即時生效失败，請檢查後端日誌。');
    }
});

router.post('/variables', async (ctx) => {
    const newVariables = ctx.request.body;
    const currentData = await loadDataFromFile();

    // 1. 保存到檔案
    await saveDataToFile({ ...currentData, variables: newVariables });
    logger.info('变量已保存到文件', { var_count: newVariables.length });

    // 2. 【核心】通知引擎熱加載
    try {
        await ctx.engine.reload();
        logger.info('规则引擎已成功熱加載 (因变量变更)');
        ctx.body = createSuccessResponse(null, '变量保存并已即時生效');
    } catch (error) {
        logger.error('熱加載变量失败', { error });
        ctx.status = 500;
        ctx.body = createErrorResponse('变量已保存，但即時生效失败，請檢查後端日誌。');
    }
});

module.exports = router;