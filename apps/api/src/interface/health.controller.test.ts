import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('shared', async () => {
  const actual = await vi.importActual<typeof import('shared')>('shared');
  return { ...actual, logger: { info: vi.fn(), error: vi.fn() } };
});

import { createHealthRouter } from './health.controller';
import { logger } from 'shared';

describe('health controller', () => {
  let sequelize: any;
  let datastore: any;
  let pubsub: any;
  let redis: any;
  let subscriptionExists: any;

  const createApp = () => {
    const app = express();
    app.use('/health_check', createHealthRouter({ sequelize, datastore, pubsub, redis }));
    return app;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sequelize = { query: vi.fn().mockResolvedValue(undefined) } as any;
    datastore = { key: vi.fn(() => 'key'), get: vi.fn().mockResolvedValue([{}]) } as any;
    subscriptionExists = vi.fn().mockResolvedValue([true]);
    pubsub = {
      topic: vi.fn(() => ({ subscription: vi.fn(() => ({ exists: subscriptionExists })) })),
      getTopics: vi.fn().mockResolvedValue([]),
    } as any;
    redis = { ping: vi.fn().mockResolvedValue('PONG') } as any;
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
    sequelize.query.mockRejectedValueOnce(new Error('db'));
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
});
