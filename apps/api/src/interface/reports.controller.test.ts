import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createReportsRouter } from './reports.controller';

describe('reports controller', () => {
  const createApp = (deps: any) => {
    const app = express();
    app.use(express.json());
    app.use(createReportsRouter(deps));
    return app;
  };

  it('lists available months', async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [{ year: 2024, month: 1 }] }) } as any;
    const app = createApp({ pool, datastore: {}, useCase: { execute: vi.fn() } });
    const res = await request(app).get('/available-months');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ year: 2024, month: 1 }]);
  });

  it('publishes generate request', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const app = createApp({ pool: { query: vi.fn() }, datastore: {}, useCase: { execute } });
    const res = await request(app).post('/generate').send({ year: 2024, month: 5 });
    expect(res.status).toBe(202);
    expect(execute).toHaveBeenCalledWith({ year: 2024, month: 5 });
  });

  it('validates generate payload', async () => {
    const app = createApp({ pool: { query: vi.fn() }, datastore: {}, useCase: { execute: vi.fn() } });
    const res = await request(app).post('/generate').send({ year: 2024, month: 13 });
    expect(res.status).toBe(400);
  });

  it('retrieves monthly report', async () => {
    const get = vi.fn().mockResolvedValue([{ year: 2024, month: 5, mechanicPerformance: {}, weeklyThroughput: {} }]);
    const datastore = { key: vi.fn(() => 'key'), get } as any;
    const app = createApp({ pool: { query: vi.fn() }, datastore, useCase: { execute: vi.fn() } });
    const res = await request(app).get('/monthly/2024/5');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ year: 2024, month: 5, mechanicPerformance: {}, weeklyThroughput: {} });
  });

  it('returns 404 for missing report', async () => {
    const datastore = { key: vi.fn(() => 'key'), get: vi.fn().mockResolvedValue([undefined]) } as any;
    const app = createApp({ pool: { query: vi.fn() }, datastore, useCase: { execute: vi.fn() } });
    const res = await request(app).get('/monthly/2024/5');
    expect(res.status).toBe(404);
  });

  it('validates monthly report params', async () => {
    const datastore = { key: vi.fn(() => 'key'), get: vi.fn() } as any;
    const app = createApp({ pool: { query: vi.fn() }, datastore, useCase: { execute: vi.fn() } });
    const res = await request(app).get('/monthly/2024/13');
    expect(res.status).toBe(400);
  });

  it('handles database errors when listing months', async () => {
    const error = new Error('db fail');
    const pool = { query: vi.fn().mockRejectedValue(error) } as any;
    const app = createApp({ pool, datastore: {}, useCase: { execute: vi.fn() } });
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
    const app = createApp({ pool: { query: vi.fn() }, datastore: {}, useCase: { execute } });
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
    const app = createApp({ pool: { query: vi.fn() }, datastore, useCase: { execute: vi.fn() } });
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
