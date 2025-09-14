import { describe, it, expect, beforeEach, vi } from 'vitest';

const validEnv = {
  DATABASE_URL: 'postgres://example.com/db',
  GCLOUD_PROJECT: 'proj',
  REDIS_URL: 'redis://redis:6379',
  PORT: '3001',
  RATE_LIMIT_MAX: '100',
  RATE_LIMIT_WINDOW: '900000',
  ALLOWED_ORIGINS: 'http://localhost',
};

describe('config', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...validEnv } as any;
  });

  it('parses valid environment', async () => {
    const { envConfig } = await import('./config');
    expect(envConfig.PORT).toBe(3001);
    expect(envConfig.ALLOWED_ORIGINS).toEqual(['http://localhost']);
  });

  it('throws on missing variables', async () => {
    delete process.env.DATABASE_URL;
    await expect(import('./config')).rejects.toThrow();
  });

  it('throws on invalid port', async () => {
    process.env.PORT = 'abc';
    await expect(import('./config')).rejects.toThrow();
  });
});
