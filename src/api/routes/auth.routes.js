const Router = require('koa-router');
const { getModuleLogger } = require('../../services/logger');
const logger = getModuleLogger('Auth'); // <-- 在檔案開頭初始化
const jwt = require('jsonwebtoken');
const { createSuccessResponse ,createErrorResponse } = require('../utils');
const UsersHelper = require('../../services/users');

const router = new Router();


router.post('/login', (ctx) => {
    const { id, password} = ctx.request.body;
    let users = new UsersHelper(ctx);
    if (users.exsits(id) && users.get(id).password === password) {
        const payload = {
            username: id,
            // 可以在這裡添加用戶ID、角色等資訊
            // userId: 1,
            // roles: ['admin']
        };
        const token = jwt.sign(payload, ctx.mainConfigManager.get('JWT_SECRET'), {
            expiresIn: '7d'
        });
        // 將 token 返回給前端
        ctx.body = createSuccessResponse({ token });
    } else {
        // ctx.status = 401;
        ctx.body = createErrorResponse( '登入失敗',401);
    }
});

router.post('/regsister', (ctx) => {
    let users = new UsersHelper(ctx);
    if(!users.allowReg()) {
        // ctx.status = 403;
        ctx.body = createErrorResponse( '禁止註冊',403);
    }
    const { id,password } = ctx.request.body;
    logger.info(`用户 ${id} 注册成功。`);
    if (users.addUser(id, password)){
        ctx.body = createSuccessResponse(null, '注册成功');
    }else{
        // ctx.status = 400;
        ctx.body = createErrorResponse('用户已存在',400);
    }

    logger.info('用户注册成功。');
});


module.exports = router;