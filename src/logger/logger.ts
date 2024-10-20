import { createLogger, format, transports } from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';

const logDir = 'logs';

const logFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}` + (info.stack ? `\nStack trace: ${info.stack}` : ''))
);

const logger = createLogger({
    level: 'info', 
    format: logFormat,
    transports: [
        new transports.DailyRotateFile({
            filename: path.join(logDir, 'application-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d',
            zippedArchive: true
        }),
        new transports.DailyRotateFile({
            filename: path.join(logDir, 'errors-%DATE%.log'),
            level: 'error',
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d',
            zippedArchive: true
        }),
        new transports.Console({
            format: format.combine(
                format.colorize(), 
                format.simple()
            )
        })
    ],
    exceptionHandlers: [
        new transports.File({ filename: path.join(logDir, 'exceptions.log') })
    ]
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

export default logger;
