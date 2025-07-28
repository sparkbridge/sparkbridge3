const Router = require('koa-router');

// 引入所有分離的路由模組
const authRoutes = require('./routes/auth.routes');
const configRoutes = require('./routes/config.routes');
const logRoutes = require('./routes/logs.routes');
const pluginRoutes = require('./routes/plugins.routes'); // 假設您已建立
const ruleRoutes = require('./routes/rules.routes');   // 假設您已建立
const generalRoutes = require('./routes/general.routes'); // 假設您已建立

// 建立帶有 /api 前綴的主路由器
const apiRouter = new Router({
    prefix: '/api'
});

// 將每個子路由模組註冊到主路由器上，並可以為它們設定各自的前綴
apiRouter.use('/auth', authRoutes.routes(), authRoutes.allowedMethods());
apiRouter.use('/config', configRoutes.routes(), configRoutes.allowedMethods());
apiRouter.use('/logs', logRoutes.routes(), logRoutes.allowedMethods());
apiRouter.use('/plugins', pluginRoutes.routes(), pluginRoutes.allowedMethods());
apiRouter.use('/rules', ruleRoutes.routes(), ruleRoutes.allowedMethods());

// 對於比較散的通用路由，可以直接註冊
apiRouter.use(generalRoutes.routes(), generalRoutes.allowedMethods());

module.exports = apiRouter;