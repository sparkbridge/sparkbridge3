// handles/logger.js
const winston = require('winston');
const { format } = winston;
require('winston-daily-rotate-file');
const Transport = require('winston-transport'); // [新增]
const EventEmitter = require('events');         // [新增]
// 默认根配置，实际项目中可在 SparkCore 启动时覆盖此值
let rootHeader = 'SparkBridge3';

// 设置根配置头部的方法
const setRootHeader = (header) => {
    if (header) rootHeader = header;
};

// 预定义颜色
const colors = {
    info: 'green',
    warn: 'yellow',
    error: 'red',
    debug: 'blue'
};
winston.addColors(colors);

// 自定义格式化器：[头部] [时间] [插件名] [级别]: 内容
const customFormat = format.printf(({ level, message, label, timestamp }) => {
    // label 就是插件名
    const pluginStr = label ? `[${label}]` : '';
    return `[${rootHeader}] ${timestamp} ${pluginStr} [${level}]: ${message}`;
});

/**
 * 获取指定名字（插件名）的 logger 实例
 */
// const getLogger = (pluginName = 'Core') => {
//     return winston.createLogger({
//         level: 'info',
//         format: format.combine(
//             format.label({ label: pluginName }),
//             format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
//             format.colorize({ all: true }), // 开启全彩输出
//             customFormat
//         ),
//         transports: [
//             new winston.transports.Console(),
//             // 同时写入文件，去除颜色控制符
//             new winston.transports.File({
//                 filename: 'logs/sparkbridge.log',
//                 format: format.combine(format.uncolorize(), customFormat)
//             })
//         ]
//     });
// };

// ==========================================
//  内存日志缓存与事件发射器
// ==========================================
const logEmitter = new EventEmitter();
const logCache = [];
const MAX_LOGS = 100; // 在内存中保留最近的 500 条日志，防止撑爆内存

class MemoryTransport extends Transport {
    log(info, callback) {
        // 因为开启了 colorize，level 和 message 可能会带有 \x1B[32m 这种控制台颜色代码
        // 这里提供一个正则函数，将发送给前端的数据洗白，只保留纯文本
        const stripAnsi = (str) => typeof str === 'string' ? str.replace(/\x1B\[\d+m/g, '') : str;

        const logEntry = {
            time: info.timestamp,
            level: stripAnsi(info.level),
            plugin: info.label || 'Default',
            msg: stripAnsi(info.message)
        };

        // 存入缓存
        logCache.push(logEntry);
        if (logCache.length > MAX_LOGS) {
            logCache.shift(); // 超过上限则剔除最旧的日志
        }

        // 触发实时事件，方便日后做 WebSocket 或 SSE 推送
        logEmitter.emit('new-log', logEntry);

        callback();
    }
}

const getLogger = (labelName = 'Default') => {
    return winston.createLogger({
        level: 'info',
        format: format.combine(
            format.label({ label: labelName }),
            format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            format.colorize({ all: true }),
            customFormat // 假设 customFormat 已在外部定义
        ),
        transports: [
            new winston.transports.Console(),

            // 使用 DailyRotateFile 替代原有的 File 运输器
            new winston.transports.DailyRotateFile({
                filename: 'logs/sb3/%DATE%.log', // 使用 %DATE% 占位符定义日期位置
                datePattern: 'YYYY-MM-DD',       // 切割频率，YYYY-MM-DD 表示按天切割
                zippedArchive: true,             // 是否对旧日志进行压缩归档
                maxSize: '20m',                  // 单个日志文件的最大大小
                maxFiles: '14d',                 // 日志保留天数，过期自动删除
                format: format.combine(
                    format.uncolorize(),         // 文件日志通常去除颜色字符
                    customFormat
                )
            }),
            new MemoryTransport()
        ]
    });
};

module.exports = { getLogger, setRootHeader, logCache, logEmitter };