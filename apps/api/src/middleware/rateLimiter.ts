import rateLimit from 'express-rate-limit';
import { envConfig } from 'shared';

export const appLimiter = rateLimit({
  windowMs: envConfig.RATE_LIMIT_WINDOW,
  max: envConfig.RATE_LIMIT_MAX,
});
