import pino from 'pino';

export const logger = pino({
  level: 'info',
  redact: ['*.password', '*.token', 'req.headers.authorization', 'req.headers.cookie'],
});
