import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

// Create logger instance with appropriate configuration
export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  
  // Use pretty printing in development
  transport: isProduction ? undefined : {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    }
  },
  
  // Redact sensitive fields from logs
  redact: {
    paths: [
      'password',
      'token',
      'authorization',
      'cookie',
      'email',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    remove: true,
  },
  
  // Add timestamp
  timestamp: pino.stdTimeFunctions.isoTime,
  
  // Base context for all logs
  base: {
    service: 'ollie-invoice',
    env: process.env.NODE_ENV || 'development',
  },
});

// Helper functions for common logging patterns
export const log = {
  info: (msg: string, data?: Record<string, any>) => {
    logger.info(data || {}, msg);
  },
  
  warn: (msg: string, data?: Record<string, any>) => {
    logger.warn(data || {}, msg);
  },
  
  error: (msg: string, error?: Error | Record<string, any>) => {
    if (error instanceof Error) {
      logger.error({ err: error }, msg);
    } else {
      logger.error(error || {}, msg);
    }
  },
  
  debug: (msg: string, data?: Record<string, any>) => {
    logger.debug(data || {}, msg);
  },
  
  // Request logging helper
  request: (req: { method: string; url: string; statusCode?: number; duration?: number }) => {
    logger.info({
      method: req.method,
      url: req.url,
      statusCode: req.statusCode,
      duration: req.duration,
    }, 'HTTP Request');
  },
};

export default logger;


