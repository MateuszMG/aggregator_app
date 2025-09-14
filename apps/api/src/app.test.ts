import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const sequelize = { query: vi.fn().mockResolvedValue(undefined) } as any;
const datastore = { key: vi.fn(() => 'key'), get: vi.fn().mockResolvedValue([{}]) } as any;
const publishMessage = vi.fn().mockResolvedValue(undefined);
const pubsub = {
  topic: vi.fn(() => ({
    get: vi.fn().mockResolvedValue([{ publishMessage }]),
  })),
  getTopics: vi.fn().mockResolvedValue([]),
} as any;
const redis = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  ping: vi.fn().mockResolvedValue('PONG'),
  sendCommand: vi
    .fn()
    .mockImplementation((args: string[]) =>
      Array.isArray(args) && args[0] === 'SCRIPT' ? Promise.resolve('sha') : Promise.resolve([1, 1]),
    ),
} as any;

vi.mock('shared', async () => {
  const actual = await vi.importActual<typeof import('shared')>('shared');
  return {
    ...actual,
    getSequelize: () => sequelize,
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

  it('returns available months', async () => {
    sequelize.query.mockResolvedValueOnce([{ year: 2024, month: 1 }]);
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
    sequelize.query.mockRejectedValueOnce(new Error('db fail'));
    const app = createApp();
    const res = await request(app).get('/api/reports/available-months');
    expect(res.status).toBe(500);
    expect(logger.error).toHaveBeenCalled();
  });

  it('serves openapi schema', async () => {
    const app = createApp();
    const res = await request(app).get('/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('openapi', '3.0.0');
    expect(res.body.paths).toHaveProperty('/health_check');
  });
});
