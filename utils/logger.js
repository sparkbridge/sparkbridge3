// src/utils/logger.js

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// 日志级别
const logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

/**
 * 自定义格式化
 */

// 1. 用于文件输出的 JSON 格式
const fileJsonFormat = winston.format.combine(
    // 设置时间戳格式
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    // 一个自定义格式化器，用于将 level 转为大写
    winston.format((info) => {
        info.level = info.level.toUpperCase();
        return info;
    })(),
    // 确保元数据（包括 module 字段）被平铺到日志对象中
    winston.format.metadata(),
    // 将最终的 info 对象转换为 JSON
    winston.format.json()
);


// 2. 用于控制台输出的美化文本格式
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(info =>
        // 让控制台也使用 'module' 字段
        `${info.timestamp} [${info.module}] ${info.level}: ${info.message}`
    )
);


/**
 * Logger 服务类
 */
class LoggerService {
    /**
     * @param {string} moduleName - 调用日志的模块/组件名称
     */
    constructor(moduleName) {
        // 定义传输器
        const transports = [
            // 控制台传输器
            new winston.transports.Console({
                format: consoleFormat,
            }),

            // 按天分割的、记录所有级别日志的文件传输器
            new DailyRotateFile({
                level: 'debug',
                // ✨ 文件名仅使用日期
                filename: path.resolve(__dirname, '../logs', '%DATE%.log'),
                format: fileJsonFormat, // 应用我们自定义的JSON格式
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true,
                maxSize: '20m',
                maxFiles: '30d', // 保留30天
            }),

            // 按天分割的、只记录 error 级别日志的文件传输器
            /* new DailyRotateFile({
                level: 'error',
                // ✨ error日志文件名也仅使用日期
                filename: path.resolve(__dirname, '../../logs', '%DATE%.error.log'),
                format: fileJsonFormat, // 同样使用自定义的JSON格式
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true,
                maxSize: '20m',
                maxFiles: '30d',
            }), */
        ];

        // 创建 winston logger 实例
        this.logger = winston.createLogger({
            level: logLevel,
            // ✨ 核心：将传入的名称赋值给 'module' 字段
            defaultMeta: { module: moduleName },
            transports: transports,
        });
    }

    // 代理方法，方便直接调用
    debug(message, ...args) {
        this.logger.debug(message, ...args);
    }

    http(message, ...args) {
        this.logger.http(message, ...args);
    }

    info(message, ...args) {
        this.logger.info(message, ...args);
    }

    warn(message, ...args) {
        this.logger.warn(message, ...args);
    }

    error(message, ...args) {
        this.logger.error(message, ...args);
    }
}

// 导出这个类
module.exports = LoggerService;