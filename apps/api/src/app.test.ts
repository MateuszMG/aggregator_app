import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const pool = { query: vi.fn().mockResolvedValue(undefined) } as any;
const datastore = { key: vi.fn(() => 'key'), get: vi.fn().mockResolvedValue([{}]) } as any;
const publishMessage = vi.fn().mockResolvedValue(undefined);
const subscriptionExists = vi.fn().mockResolvedValue([true]);
const pubsub = {
  topic: vi.fn(() => ({
    get: vi.fn().mockResolvedValue([{ publishMessage }]),
    subscription: vi.fn(() => ({ exists: subscriptionExists })),
  })),
  getTopics: vi.fn().mockResolvedValue([]),
} as any;
const redis = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  ping: vi.fn().mockResolvedValue('PONG'),
} as any;

vi.mock('shared', async () => {
  const actual = await vi.importActual<typeof import('shared')>('shared');
  return {
    ...actual,
    getPool: () => pool,
    getDatastore: () => datastore,
    getPubSub: () => pubsub,
    getRedis: () => redis,
    logger: { info: vi.fn(), error: vi.fn() },
  };
});

import { createApp } from './app';
import { logger } from 'shared';

describe('app integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('responds to health check', async () => {
    const app = createApp();
    const res = await request(app).get('/health_check');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      redis: true,
      database: true,
      gcpEmulator: true,
      aggregator: true,
    });
  });

  it('reports failing health check', async () => {
    redis.ping.mockRejectedValueOnce(new Error('fail'));
    pool.query.mockRejectedValueOnce(new Error('db'));
    pubsub.getTopics.mockRejectedValueOnce(new Error('pub'));
    datastore.get.mockRejectedValueOnce(new Error('ds'));
    subscriptionExists.mockRejectedValueOnce(new Error('sub'));
    const app = createApp();
    const res = await request(app).get('/health_check');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      redis: false,
      database: false,
      gcpEmulator: false,
      aggregator: false,
    });
    expect(logger.error).toHaveBeenCalled();
  });

  it('returns available months', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ year: 2024, month: 1 }] });
    const app = createApp();
    const res = await request(app).get('/api/reports/available-months');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ year: 2024, month: 1 }]);
  });

  it('publishes generate report requests', async () => {
    const app = createApp();
    const res = await request(app).post('/api/reports/generate').send({ year: 2024, month: 5 });
    expect(res.status).toBe(202);
    expect(pubsub.topic).toHaveBeenCalled();
    expect(publishMessage).toHaveBeenCalledWith({ json: { year: 2024, month: 5 } });
  });

  it('returns monthly report', async () => {
    datastore.get.mockResolvedValueOnce([{ year: 2024, month: 5, mechanicPerformance: {}, weeklyThroughput: {} }]);
    const app = createApp();
    const res = await request(app).get('/api/reports/monthly/2024/5');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ year: 2024, month: 5, mechanicPerformance: {}, weeklyThroughput: {} });
  });

  it('returns 404 for missing monthly report', async () => {
    datastore.get.mockResolvedValueOnce([undefined]);
    const app = createApp();
    const res = await request(app).get('/api/reports/monthly/2024/5');
    expect(res.status).toBe(404);
  });

  it('returns 500 when publishing fails', async () => {
    publishMessage.mockRejectedValueOnce(new Error('boom'));
    const app = createApp();
    const res = await request(app).post('/api/reports/generate').send({ year: 2024, month: 5 });
    expect(res.status).toBe(500);
    expect(logger.error).toHaveBeenCalled();
  });

  it('returns 500 when datastore retrieval fails', async () => {
    datastore.get.mockRejectedValueOnce(new Error('ds fail'));
    const app = createApp();
    const res = await request(app).get('/api/reports/monthly/2024/5');
    expect(res.status).toBe(500);
    expect(logger.error).toHaveBeenCalled();
  });

  it('returns 500 when listing months fails', async () => {
    pool.query.mockRejectedValueOnce(new Error('db fail'));
    const app = createApp();
    const res = await request(app).get('/api/reports/available-months');
    expect(res.status).toBe(500);
    expect(logger.error).toHaveBeenCalled();
  });
});
