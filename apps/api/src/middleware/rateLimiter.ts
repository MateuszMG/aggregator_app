import rateLimit from 'express-rate-limit';
import { envConfig, getRedis } from 'shared';
import RedisStore from 'rate-limit-redis';

export const appLimiter = () =>
  rateLimit({
    windowMs: envConfig.RATE_LIMIT_WINDOW,
    max: envConfig.RATE_LIMIT_MAX,
    store: new RedisStore({
      sendCommand: (...args: string[]) => getRedis().sendCommand(args as any),
    }),
  });
