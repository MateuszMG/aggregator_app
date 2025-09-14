import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('clients', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.GCLOUD_PROJECT = 'proj';
    process.env.DATABASE_URL = 'postgres://example.com/db';
    process.env.REDIS_URL = 'redis://example:6379';
    process.env.API_PORT = '3001';
    process.env.RATE_LIMIT_MAX = '100';
    process.env.RATE_LIMIT_WINDOW = '900000';
    process.env.PG_POOL_MAX = '20';
    process.env.PG_POOL_IDLE = '5000';
    process.env.ALLOWED_ORIGINS = 'http://localhost';
  });

  it('creates a single pg pool instance', async () => {
    const poolInstance = {};
    const PoolMock = vi.fn(() => poolInstance);
    vi.doMock('pg', () => ({ Pool: PoolMock }));
    const { getPool } = await import('./clients');
    const p1 = getPool();
    const p2 = getPool();
    expect(p1).toBe(poolInstance);
    expect(p1).toBe(p2);
    expect(PoolMock).toHaveBeenCalledTimes(1);
    expect(PoolMock).toHaveBeenCalledWith({
      connectionString: 'postgres://example.com/db',
      max: 20,
      idleTimeoutMillis: 5000,
    });
  });

  it('creates a single pubsub client with projectId', async () => {
    const pubInstance = {};
    const PubSubMock = vi.fn(() => pubInstance);
    vi.doMock('@google-cloud/pubsub', () => ({ PubSub: PubSubMock }));
    const { getPubSub } = await import('./clients');
    const c1 = getPubSub();
    const c2 = getPubSub();
    expect(c1).toBe(pubInstance);
    expect(c1).toBe(c2);
    expect(PubSubMock).toHaveBeenCalledTimes(1);
    expect(PubSubMock).toHaveBeenCalledWith({ projectId: 'proj' });
  });

  it('creates a single datastore client with projectId', async () => {
    const dsInstance = {};
    const DatastoreMock = vi.fn(() => dsInstance);
    vi.doMock('@google-cloud/datastore', () => ({ Datastore: DatastoreMock }));
    const { getDatastore } = await import('./clients');
    const d1 = getDatastore();
    const d2 = getDatastore();
    expect(d1).toBe(dsInstance);
    expect(d1).toBe(d2);
    expect(DatastoreMock).toHaveBeenCalledTimes(1);
    expect(DatastoreMock).toHaveBeenCalledWith({ projectId: 'proj' });
  });

  it('creates a single redis client with url', async () => {
    const redisInstance = { on: vi.fn(), connect: vi.fn().mockResolvedValue(undefined) } as any;
    const createClientMock = vi.fn(() => redisInstance);
    vi.doMock('redis', () => ({ createClient: createClientMock }));
    const { getRedis } = await import('./clients');
    const r1 = getRedis();
    const r2 = getRedis();
    expect(r1).toBe(redisInstance);
    expect(r1).toBe(r2);
    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(createClientMock).toHaveBeenCalledWith({ url: 'redis://example:6379' });
    expect(redisInstance.connect).toHaveBeenCalledTimes(1);
  });

  it('logs redis errors on connection failure', async () => {
    const errorLogger = vi.fn();
    const redisInstance = {
      on: vi.fn(),
      connect: vi.fn().mockRejectedValue(new Error('fail')),
    } as any;
    const createClientMock = vi.fn(() => redisInstance);
    vi.doMock('redis', () => ({ createClient: createClientMock }));
    vi.doMock('./logger', () => ({ logger: { error: errorLogger } }));
    const { getRedis } = await import('./clients');
    getRedis();
    await Promise.resolve();
    const handler = redisInstance.on.mock.calls[0][1];
    handler(new Error('boom'));
    expect(errorLogger).toHaveBeenCalledWith({ err: 'boom' }, 'Redis Client Error');
    expect(errorLogger).toHaveBeenCalledWith({ err: 'fail' }, 'Redis connection failed');
  });

  it('uses redis service as the default URL', async () => {
    delete process.env.REDIS_URL;
    const redisInstance = { on: vi.fn(), connect: vi.fn().mockResolvedValue(undefined) } as any;
    const createClientMock = vi.fn(() => redisInstance);
    vi.doMock('redis', () => ({ createClient: createClientMock }));
    const { getRedis } = await import('./clients');
    getRedis();
    expect(createClientMock).toHaveBeenCalledWith({ url: 'redis://redis:6379' });
  });
});
