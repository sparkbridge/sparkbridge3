const Router = require('koa-router');
const { getModuleLogger } = require('../../services/logger');

const logger = getModuleLogger('General');
const mock = require('../../data/mockData');
const { createSuccessResponse } = require('../utils');

const router = new Router();

// GET /api/private_chat_list
router.get('/private_chat_list', (ctx) => {
    ctx.body = createSuccessResponse(mock.privateChatList);
});

// GET /api/group_chat_list
router.get('/group_chat_list', (ctx) => {
    ctx.body = createSuccessResponse(mock.groupChatList);
});

// GET /api/slogans
router.get('/slogans', (ctx) => {
    ctx.body = createSuccessResponse(mock.slogans);
});

// GET /api/announcement
router.get('/announcement', (ctx) => {
    ctx.body = createSuccessResponse(mock.announcement);
});

// GET /api/sponsors
router.get('/sponsors', (ctx) => {
    ctx.body = createSuccessResponse(mock.sponsors);
});

// POST /api/button_click_event
router.post('/button_click_event', (ctx) => {
    const payload = ctx.request.body;
    logger.info('收到按钮点击事件', { payload });
    ctx.body = createSuccessResponse(null, '事件已触发');
});

module.exports = router;