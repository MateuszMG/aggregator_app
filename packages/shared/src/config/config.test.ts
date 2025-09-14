import { describe, it, expect, beforeEach, vi } from 'vitest';

const validEnv = {
  DATABASE_URL: 'postgres://example.com/db',
  GCLOUD_PROJECT: 'proj',
  REDIS_URL: 'redis://redis:6379',
  API_PORT: '3001',
  RATE_LIMIT_MAX: '100',
  RATE_LIMIT_WINDOW: '900000',
  PG_POOL_MAX: '10',
  PG_POOL_IDLE: '10000',
  AGGREGATOR_PORT: '3002',
  ALLOWED_ORIGINS: 'http://localhost',
};

describe('config', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...validEnv } as any;
  });

  it('parses valid environment', async () => {
    const { envConfig } = await import('./config');
    expect(envConfig.API_PORT).toBe(3001);
    expect(envConfig.AGGREGATOR_PORT).toBe(3002);
    expect(envConfig.ALLOWED_ORIGINS).toEqual(['http://localhost']);
    expect(envConfig.OTEL_EXPORTER_OTLP_ENDPOINT).toBe('http://localhost:4318/v1/traces');
    expect(envConfig.REQUEST_BODY_LIMIT).toBe('1mb');
  });

  it('throws on missing variables', async () => {
    delete process.env.DATABASE_URL;
    await expect(import('./config')).rejects.toThrow();
  });

  it('throws on invalid port', async () => {
    process.env.API_PORT = 'abc';
    await expect(import('./config')).rejects.toThrow();
  });
});
