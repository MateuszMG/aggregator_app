import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createReportsRouter } from './reports.controller';
import { ValidationError, NotFoundError } from 'shared';

describe('reports controller', () => {
  const createApp = (deps: any, withErrorHandler = true) => {
    const app = express();
    app.use(express.json());
    const redis =
      deps.redis || ({ get: vi.fn().mockResolvedValue(null), set: vi.fn().mockResolvedValue(undefined) } as any);
    app.use(createReportsRouter({ ...deps, redis }));
    if (withErrorHandler) {
      app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        if (err instanceof ValidationError) {
          return res.status(400).json({ errors: err.details });
        }
        if (err instanceof NotFoundError) {
          return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: 'Internal Server Error' });
      });
    }
    return app;
  };

  it('lists available months', async () => {
    const sequelize = { query: vi.fn().mockResolvedValue([{ year: 2024, month: 1 }]) } as any;
    const app = createApp({
      sequelize,
      datastore: {},
      useCase: { execute: vi.fn() },
    });
    const res = await request(app).get('/available-months');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ year: 2024, month: 1 }]);
  });

  it('uses UTC when querying available months', async () => {
    const sequelize = { query: vi.fn().mockResolvedValue([]) } as any;
    const app = createApp({
      sequelize,
      datastore: {},
      useCase: { execute: vi.fn() },
    });
    await request(app).get('/available-months');
    const sql = (sequelize.query as any).mock.calls[0][0];
    expect(sql).toContain("EXTRACT(YEAR FROM date_finished AT TIME ZONE 'UTC')");
    expect(sql).toContain("EXTRACT(MONTH FROM date_finished AT TIME ZONE 'UTC')");
  });

  it('returns cached months when available', async () => {
    const sequelize = { query: vi.fn() } as any;
    const redis = {
      get: vi.fn().mockResolvedValue(JSON.stringify([{ year: 2024, month: 1 }])),
      set: vi.fn(),
    } as any;
    const app = createApp({ sequelize, datastore: {}, useCase: { execute: vi.fn() }, redis }, false);
    const res = await request(app).get('/available-months');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ year: 2024, month: 1 }]);
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  it('falls back to db when cache retrieval fails for months', async () => {
    const sequelize = { query: vi.fn().mockResolvedValue([]) } as any;
    const redis = {
      get: vi.fn().mockRejectedValue(new Error('cache get')),
      set: vi.fn().mockResolvedValue(undefined),
    } as any;
    const app = createApp({ sequelize, datastore: {}, useCase: { execute: vi.fn() }, redis });
    const res = await request(app).get('/available-months');
    expect(res.status).toBe(200);
    expect(sequelize.query).toHaveBeenCalled();
  });

  it('handles cache store errors when listing months', async () => {
    const sequelize = { query: vi.fn().mockResolvedValue([{ year: 2024, month: 1 }]) } as any;
    const redis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockRejectedValue(new Error('cache set')),
    } as any;
    const app = createApp({ sequelize, datastore: {}, useCase: { execute: vi.fn() }, redis });
    const res = await request(app).get('/available-months');
    expect(res.status).toBe(200);
    expect(redis.set).toHaveBeenCalled();
  });

  it('publishes generate request', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);

    const app = createApp({ sequelize: { query: vi.fn() }, datastore: {}, useCase: { execute } }, false);

    const res = await request(app).post('/generate').send({ year: 2024, month: 5 });
    expect(res.status).toBe(202);
    expect(execute).toHaveBeenCalledWith({ year: 2024, month: 5 });
  });

  it('validates generate payload', async () => {
    const app = createApp({ sequelize: { query: vi.fn() }, datastore: {}, useCase: { execute: vi.fn() } });
    const res = await request(app).post('/generate').send({ year: 2024, month: 13 });
    expect(res.status).toBe(400);
  });

  it('retrieves monthly report', async () => {
    const get = vi.fn().mockResolvedValue([{ year: 2024, month: 5, mechanicPerformance: {}, weeklyThroughput: {} }]);
    const datastore = { key: vi.fn(() => 'key'), get } as any;

    const app = createApp({ sequelize: { query: vi.fn() }, datastore, useCase: { execute: vi.fn() } }, false);

    const res = await request(app).get('/monthly/2024/5');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ year: 2024, month: 5, mechanicPerformance: {}, weeklyThroughput: {} });
  });

  it('returns cached monthly report when available', async () => {
    const datastore = { key: vi.fn(() => 'key'), get: vi.fn() } as any;
    const redis = {
      get: vi
        .fn()
        .mockResolvedValue(JSON.stringify({ year: 2024, month: 5, mechanicPerformance: {}, weeklyThroughput: {} })),
      set: vi.fn(),
    } as any;
    const app = createApp({ sequelize: { query: vi.fn() }, datastore, useCase: { execute: vi.fn() }, redis });
    const res = await request(app).get('/monthly/2024/5');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ year: 2024, month: 5, mechanicPerformance: {}, weeklyThroughput: {} });
    expect(datastore.get).not.toHaveBeenCalled();
  });

  it('falls back to datastore when cache retrieval fails for report', async () => {
    const datastore = {
      key: vi.fn(() => 'key'),
      get: vi.fn().mockResolvedValue([{ year: 2024, month: 5, mechanicPerformance: {}, weeklyThroughput: {} }]),
    } as any;
    const redis = {
      get: vi.fn().mockRejectedValue(new Error('cache get')),
      set: vi.fn().mockResolvedValue(undefined),
    } as any;
    const app = createApp({ sequelize: { query: vi.fn() }, datastore, useCase: { execute: vi.fn() }, redis });
    const res = await request(app).get('/monthly/2024/5');
    expect(res.status).toBe(200);
    expect(datastore.get).toHaveBeenCalled();
  });

  it('handles cache store errors when fetching report', async () => {
    const datastore = {
      key: vi.fn(() => 'key'),
      get: vi.fn().mockResolvedValue([{ year: 2024, month: 5, mechanicPerformance: {}, weeklyThroughput: {} }]),
    } as any;
    const redis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockRejectedValue(new Error('cache set')),
    } as any;
    const app = createApp({ sequelize: { query: vi.fn() }, datastore, useCase: { execute: vi.fn() }, redis });
    const res = await request(app).get('/monthly/2024/5');
    expect(res.status).toBe(200);
    expect(redis.set).toHaveBeenCalled();
  });

  it('returns 404 for missing report', async () => {
    const datastore = { key: vi.fn(() => 'key'), get: vi.fn().mockResolvedValue([undefined]) } as any;
    const app = createApp({ sequelize: { query: vi.fn() }, datastore, useCase: { execute: vi.fn() } });
    const res = await request(app).get('/monthly/2024/5');
    expect(res.status).toBe(404);
  });

  it('validates monthly report params', async () => {
    const datastore = { key: vi.fn(() => 'key'), get: vi.fn() } as any;
    const app = createApp({ sequelize: { query: vi.fn() }, datastore, useCase: { execute: vi.fn() } });
    const res = await request(app).get('/monthly/2024/13');
    expect(res.status).toBe(400);
  });

  it('handles database errors when listing months', async () => {
    const error = new Error('db fail');

    const sequelize = { query: vi.fn().mockRejectedValue(error) } as any;
    const app = createApp({ sequelize, datastore: {}, useCase: { execute: vi.fn() } }, false);

    const errors: any[] = [];
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      errors.push(err);
      res.status(500).send();
    });
    const res = await request(app).get('/available-months');
    expect(res.status).toBe(500);
    expect(errors[0].logged).toBe(true);
  });

  it('handles publish errors', async () => {
    const error = new Error('publish fail');
    const execute = vi.fn().mockRejectedValue(error);

    const app = createApp({ sequelize: { query: vi.fn() }, datastore: {}, useCase: { execute } }, false);

    const errors: any[] = [];
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      errors.push(err);
      res.status(500).send();
    });
    const res = await request(app).post('/generate').send({ year: 2024, month: 5 });
    expect(res.status).toBe(500);
    expect(errors[0].logged).toBe(true);
  });

  it('handles datastore errors when fetching reports', async () => {
    const error = new Error('ds fail');
    const datastore = { key: vi.fn(() => 'key'), get: vi.fn().mockRejectedValue(error) } as any;

    const app = createApp({ sequelize: { query: vi.fn() }, datastore, useCase: { execute: vi.fn() } }, false);

    const errors: any[] = [];
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      errors.push(err);
      res.status(500).send();
    });
    const res = await request(app).get('/monthly/2024/5');
    expect(res.status).toBe(500);
    expect(errors[0].logged).toBe(true);
  });
});
