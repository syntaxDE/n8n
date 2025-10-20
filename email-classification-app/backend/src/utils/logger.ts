import winston from 'winston';
import path from 'path';

const logLevel = process.env.LOG_LEVEL || 'info';
const isProduction = process.env.NODE_ENV === 'production';

// Custom format für strukturierte Logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format für Development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}] ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta, null, 2)}`;
    }
    return msg;
  })
);

// Transports
const transports: winston.transport[] = [
  // Console
  new winston.transports.Console({
    format: isProduction ? logFormat : consoleFormat
  })
];

// File transport in Production
if (isProduction) {
  transports.push(
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      format: logFormat
    }),
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      format: logFormat
    })
  );
}

export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  transports,
  exceptionHandlers: isProduction
    ? [
        new winston.transports.File({
          filename: path.join('logs', 'exceptions.log')
        })
      ]
    : [],
  rejectionHandlers: isProduction
    ? [
        new winston.transports.File({
          filename: path.join('logs', 'rejections.log')
        })
      ]
    : []
});

// Stream für Morgan (HTTP logging)
export const httpLogStream = {
  write: (message: string) => {
    logger.http(message.trim());
  }
};
