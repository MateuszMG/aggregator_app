import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  GCLOUD_PROJECT: z.string().default('local-dev'),
  REDIS_URL: z.string().url().default('redis://redis:6379'),
  PORT: z.coerce.number().int().positive(),
  RATE_LIMIT_MAX: z.coerce.number().int().positive(),
  RATE_LIMIT_WINDOW: z.coerce.number().int().positive(),
  ALLOWED_ORIGINS: z.string().transform((val) =>
    val
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean),
  ),
});

export const envConfig = envSchema.parse(process.env);
export type Config = typeof envConfig;
