import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { getCached, setCached } from './redis';
import { logger } from '../middleware/logger';
import { envConfig } from '../config/config';

describe('redis helpers', () => {
  it('returns cached value when available', async () => {
    const redis = { get: vi.fn().mockResolvedValue(JSON.stringify({ a: 1 })) } as any;
    const schema = z.object({ a: z.number() });
    const result = await getCached(redis, 'key', schema, 'msg');
    expect(result).toEqual({ a: 1 });
    expect(redis.get).toHaveBeenCalledWith('key');
  });

  it('logs error and returns null when get fails', async () => {
    const redis = { get: vi.fn().mockRejectedValue(new Error('fail')) } as any;
    const schema = z.object({ a: z.number() });
    const spy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const result = await getCached(redis, 'key', schema, 'msg');
    expect(result).toBeNull();
    expect(spy).toHaveBeenCalledWith({ err: 'fail' }, 'msg');
    spy.mockRestore();
  });

  it('sets cache with ttl', async () => {
    const redis = { set: vi.fn().mockResolvedValue('OK') } as any;
    await setCached(redis, 'key', { b: 2 }, 'msg');
    expect(redis.set).toHaveBeenCalledWith('key', JSON.stringify({ b: 2 }), {
      EX: envConfig.REPORTS_CACHE_TTL_SECONDS,
    });
  });

  it('logs error when set fails', async () => {
    const redis = { set: vi.fn().mockRejectedValue(new Error('fail')) } as any;
    const spy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    await setCached(redis, 'key', { b: 2 }, 'msg');
    expect(spy).toHaveBeenCalledWith({ err: 'fail' }, 'msg');
    spy.mockRestore();
  });
});
