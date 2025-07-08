// src/app.js
const LoggerService = require('./utils/logger'); // 导入 LoggerService 类
const appLogger = new LoggerService('KoaApp');   // ✨ 为 KoaApp 创建一个专用的 logger 实例

const Koa = require('koa');
const app = new Koa();

appLogger.info('应用程序启动中...');

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  appLogger.http(`${ctx.method} ${ctx.url} - ${ms}ms`);
});

app.use(ctx => {
  appLogger.debug('处理根路径请求 /');
  try {
    throw new Error('这是一个模拟的内部错误！');
  } catch (e) {
    appLogger.error(`处理请求时发生错误: ${e.message}`);
    ctx.status = 500;
    ctx.body = 'Internal Server Error';
  }
});

const port = 3000;
app.listen(port, () => {
  appLogger.info(`服务器已成功启动，监听端口 ${port}`);
});