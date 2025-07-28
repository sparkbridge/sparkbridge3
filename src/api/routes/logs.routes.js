const Router = require('koa-router');
const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');

const { getModuleLogger } = require('../../services/logger');

const logger = getModuleLogger('LogSystem');
const { createSuccessResponse, createErrorResponse } = require('../utils');

const router = new Router();
router.use(authMiddleware);
const logDir = path.join(process.cwd(), 'logs');

// GET /api/logs/dates
router.get('/dates', async (ctx) => {
    try {
        const files = await fs.readdir(logDir);
        const dates = files
            .map(file => file.match(/app-(\d{4}-\d{2}-\d{2})\.log/)?.[1])
            .filter(Boolean)
            .sort((a, b) => b.localeCompare(a));
        ctx.body = createSuccessResponse(dates);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await fs.mkdir(logDir, { recursive: true });
            return ctx.body = createSuccessResponse([]);
        }
        logger.error('获取日志日期列表失败', { error: error.message });
        ctx.body = createErrorResponse('获取日志日期列表失败');
    }
});

// GET /api/logs/content/:date
router.get('/content/:date', async (ctx) => {
    const { date } = ctx.params;
    const logFile = path.join(logDir, `app-${date}.log`);
    try {
        const content = await fs.readFile(logFile, 'utf-8');
        const logs = content.split('\n').filter(Boolean).map(JSON.parse);
        ctx.body = createSuccessResponse(logs);
    } catch (error) {
        if (error.code === 'ENOENT') {
            ctx.status = 404;
            ctx.body = createErrorResponse('找不到指定日期的日志文件');
        } else {
            logger.error(`读取日志文件 ${logFile} 失败`, { error: error.message });
            ctx.status = 500;
            ctx.body = createErrorResponse('读取日志文件时发生错误');
        }
    }
});

module.exports = router;