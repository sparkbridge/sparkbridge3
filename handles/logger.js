// handles/logger.js
const winston = require('winston');
const { format } = winston;
require('winston-daily-rotate-file');
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
                filename: 'logs/%DATE%.log', // 使用 %DATE% 占位符定义日期位置
                datePattern: 'YYYY-MM-DD',       // 切割频率，YYYY-MM-DD 表示按天切割
                zippedArchive: true,             // 是否对旧日志进行压缩归档
                maxSize: '20m',                  // 单个日志文件的最大大小
                maxFiles: '14d',                 // 日志保留天数，过期自动删除
                format: format.combine(
                    format.uncolorize(),         // 文件日志通常去除颜色字符
                    customFormat
                )
            })
        ]
    });
};

module.exports = { getLogger, setRootHeader };