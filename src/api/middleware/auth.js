const jwt = require('jsonwebtoken');
const { createErrorResponse } = require('../utils');
const logger = require('../../services/logger').getModuleLogger('AuthMiddleware');


/**
 * Koa 認證中介軟體
 * 檢查請求頭中是否包含有效的 JWT
 */
const authMiddleware = async (ctx, next) => {
    // 從請求頭中獲取 Authorization
    const authHeader = ctx.headers.authorization;

    // 檢查 Header 是否存在且格式正確 (Bearer <token>)
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ctx.status = 401; // 401 Unauthorized
        ctx.body = createErrorResponse('未提供授權 Token 或格式不正確。');
        logger.warn('拒絕訪問：缺少 Authorization Header。');
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        // 驗證 token 是否有效、是否過期
        const decoded = jwt.verify(token, ctx.mainConfigManager.get('JWT_SECRET'));

        // 將解碼後的用戶資訊附加到 Koa 的 state 中，供後續路由使用
        ctx.state.user = decoded;
        // logger.info(`用戶 [${decoded.username}] 驗證通過。`);

        // 驗證通過，繼續執行下一個中介軟體 (即路由處理器)
        await next();
    } catch (error) {
        ctx.status = 401;
        ctx.body = createErrorResponse('Token 無效或已過期。');
        logger.warn('拒絕訪問：Token 驗證失敗。', { error: error.message });
    }
};

module.exports = authMiddleware;
