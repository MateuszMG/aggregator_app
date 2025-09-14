import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  GCLOUD_PROJECT: z.string().default('local-dev'),
  REDIS_URL: z.string().url().default('redis://redis:6379'),
  PORT: z.coerce.number().int().positive(),
  AGGREGATOR_PORT: z.coerce.number().int().positive().default(3002),
  RATE_LIMIT_MAX: z.coerce.number().int().positive(),
  RATE_LIMIT_WINDOW: z.coerce.number().int().positive(),
  PG_POOL_MAX: z.coerce.number().int().positive().default(10),
  PG_POOL_IDLE: z.coerce.number().int().nonnegative().default(10000),
  ALLOWED_ORIGINS: z.string().transform((val) =>
    val
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean),
  ),
});

export const envConfig = envSchema.parse(process.env);
export type Config = typeof envConfig;
