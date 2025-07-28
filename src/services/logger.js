const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const logDir = path.join(process.cwd(), 'logs');

const fileLogFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.splat(), // 這個很重要，它能將 { module: '...' } 這樣的元數據合併到日誌對象中
    winston.format.json()
);

// 2. 【核心修改】控制台日誌的格式
const consoleLogFormat = winston.format.combine(
    winston.format.colorize(), // 為日誌等級添加顏色
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // 添加時間戳
    winston.format.splat(), // 同樣需要 splat 來獲取 module 名稱
    // 使用 printf 自訂最終的輸出格式
    winston.format.printf(({ timestamp, level, message, module }) => {
        // 如果日誌記錄中沒有提供 module，則預設為 'System'
        const moduleName = module || 'System';
        // 使用 padEnd 讓模組名對齊，更美觀
        const moduleStr = `[${moduleName}]`.padEnd(5, ' ');
        return `${timestamp} ${moduleStr} ${level}: ${message}`;
    })
);

// 3. 創建核心 logger 實例
const coreLogger = winston.createLogger({
    level: 'info', // 記錄的最低級別
    transports: [
        // 文件日誌傳輸器 (使用 JSON 格式)
        new DailyRotateFile({
            filename: path.join(logDir, 'app-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            format: fileLogFormat,
        }),
        // 控制台日誌傳輸器 (使用我們自訂的格式)
        new winston.transports.Console({
            format: consoleLogFormat
        })
    ]
});
const getLogger = (moduleName) => {
    return {
        info: (message, ...args) => {
            // 將 moduleName 作為元數據傳遞給 coreLogger
            coreLogger.info(message, ...args, { module: moduleName });
        },
        warn: (message, ...args) => {
            coreLogger.warn(message, ...args, { module: moduleName });
        },
        error: (message, ...args) => {
            coreLogger.error(message, ...args, { module: moduleName });
        },
        debug: (message, ...args) => {
            coreLogger.debug(message, ...args, { module: moduleName });
        },
    };
};


module.exports = {
    getModuleLogger:getLogger,
    // 我們依然導出一個通用 logger，用於 server.js 等非模組化的地方
    logger: getLogger('System')
};