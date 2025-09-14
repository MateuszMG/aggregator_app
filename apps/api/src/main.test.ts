import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  createApp: vi.fn(),
  getPool: vi.fn(),
  getPubSub: vi.fn(),
  getDatastore: vi.fn(),
  loggerInfo: vi.fn(),
  loggerError: vi.fn(),
  serverClose: vi.fn(),
  gracefulShutdown: vi.fn(async (_signal, resources: any[]) => {
    await Promise.all(resources.map((r: any) => r.close()));
  }),
}));

vi.mock('./app', () => ({
  createApp: mocks.createApp,
}));

vi.mock('shared', () => ({
  getPool: mocks.getPool,
  getPubSub: mocks.getPubSub,
  getDatastore: mocks.getDatastore,
  logger: { info: mocks.loggerInfo, error: mocks.loggerError },
  gracefulShutdown: mocks.gracefulShutdown,
  envConfig: { API_PORT: 3001 },
}));

describe('main', () => {
  beforeEach(() => {
    vi.resetModules();
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('SIGTERM');
    Object.values(mocks).forEach((m) => 'mockReset' in m && m.mockReset());
  });

  it('cleans up resources on SIGINT', async () => {
    const pool = { end: vi.fn().mockResolvedValue(undefined) } as any;
    const pubsub = { close: vi.fn().mockResolvedValue(undefined) } as any;
    const datastore = { close: vi.fn().mockResolvedValue(undefined) } as any;
    mocks.serverClose.mockImplementation((cb: () => void) => cb());
    const server = { close: mocks.serverClose } as any;

    mocks.createApp.mockReturnValue({
      listen: vi.fn((_port: number, cb: () => void) => {
        cb();
        return server;
      }),
    });
    mocks.getPool.mockReturnValue(pool);
    mocks.getPubSub.mockReturnValue(pubsub);
    mocks.getDatastore.mockReturnValue(datastore);

    await import('./main');

    process.emit('SIGINT');
    await Promise.resolve();

    expect(mocks.serverClose).toHaveBeenCalled();
    expect(pool.end).toHaveBeenCalled();
    expect(pubsub.close).toHaveBeenCalled();
    expect(datastore.close).toHaveBeenCalled();
  });
});
