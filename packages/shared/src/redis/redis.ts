import type { RedisClientType } from 'redis';
import { logger } from '../middleware/logger';
import { envConfig } from '../config/config';

type Parser<T> = { parse: (input: unknown) => T };

export const getCached = async <T>(
  redis: RedisClientType,
  key: string,
  schema: Parser<T>,
  message: string,
): Promise<T | null> => {
  try {
    const cached = await redis.get(key);
    if (cached) {
      return schema.parse(JSON.parse(cached));
    }
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, message);
  }
  return null;
};

export const setCached = async (
  redis: RedisClientType,
  key: string,
  value: unknown,
  message: string,
): Promise<void> => {
  try {
    await redis.set(key, JSON.stringify(value), {
      EX: envConfig.REPORTS_CACHE_TTL_SECONDS,
    });
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, message);
  }
};
