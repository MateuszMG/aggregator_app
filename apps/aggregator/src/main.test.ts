import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  getPool: vi.fn(),
  getDatastore: vi.fn(),
  getPubSub: vi.fn(),
  loggerError: vi.fn(),
  loggerInfo: vi.fn(),
  startSubscriber: vi.fn(),
  GenerateReportUseCase: vi.fn(),
  fetchOrders: vi.fn(),
  saveReport: vi.fn(),
  initTelemetry: vi.fn(),
  gracefulShutdown: vi.fn(async (_signal, resources: any[]) => {
    await Promise.all(resources.map((r: any) => r.close()));
  }),
}));

vi.mock('shared', () => ({
  getPool: mocks.getPool,
  getDatastore: mocks.getDatastore,
  getPubSub: mocks.getPubSub,
  logger: { error: mocks.loggerError, info: mocks.loggerInfo },
  gracefulShutdown: mocks.gracefulShutdown,
  envConfig: { AGGREGATOR_PORT: 3002 },
  initTelemetry: mocks.initTelemetry,
}));
vi.mock('./interface/pubsub.subscriber', () => ({ startSubscriber: mocks.startSubscriber }));
vi.mock('./application/generate-report.usecase', () => ({ GenerateReportUseCase: mocks.GenerateReportUseCase }));
vi.mock('./infrastructure/pg.orderRepository', () => ({ fetchOrders: mocks.fetchOrders }));
vi.mock('./infrastructure/datastore.reportRepository', () => ({ saveReport: mocks.saveReport }));

describe('main', () => {
  beforeEach(() => {
    vi.resetModules();
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('SIGTERM');
    Object.values(mocks).forEach((m) => 'mockReset' in m && m.mockReset());
  });

  it('starts subscriber successfully', async () => {
    const pool = {};
    const datastore = {};
    const pubsub = {};
    const subscription = {};
    mocks.getPool.mockReturnValue(pool);
    mocks.getDatastore.mockReturnValue(datastore);
    mocks.getPubSub.mockReturnValue(pubsub);
    mocks.startSubscriber.mockResolvedValue(subscription);
    mocks.fetchOrders.mockImplementation(() => {});
    mocks.saveReport.mockImplementation(() => {});

    const useCaseInstance = {};
    mocks.GenerateReportUseCase.mockImplementation((orderRepo: any, reportRepo: any) => {
      orderRepo.fetchOrders(2024, 5);
      reportRepo.save({ test: true });
      return useCaseInstance;
    });

    await import('./main');
    await Promise.resolve();

    expect(mocks.getPool).toHaveBeenCalled();
    expect(mocks.getDatastore).toHaveBeenCalled();
    expect(mocks.getPubSub).toHaveBeenCalled();
    expect(mocks.GenerateReportUseCase).toHaveBeenCalled();
    expect(mocks.fetchOrders).toHaveBeenCalledWith(pool, 2024, 5);
    expect(mocks.saveReport).toHaveBeenCalledWith(datastore, { test: true });
    expect(mocks.startSubscriber).toHaveBeenCalledWith(pubsub, useCaseInstance);
    expect(mocks.loggerError).not.toHaveBeenCalled();
  });

  it('cleans up resources on SIGINT', async () => {
    const pool = { end: vi.fn().mockResolvedValue(undefined) } as any;
    const pubsub = { close: vi.fn().mockResolvedValue(undefined) } as any;
    const datastore = { close: vi.fn().mockResolvedValue(undefined) } as any;
    const subscription = { close: vi.fn().mockResolvedValue(undefined) } as any;
    mocks.getPool.mockReturnValue(pool);
    mocks.getPubSub.mockReturnValue(pubsub);
    mocks.getDatastore.mockReturnValue(datastore);
    mocks.startSubscriber.mockResolvedValue(subscription);
    mocks.GenerateReportUseCase.mockReturnValue({});

    await import('./main');

    process.emit('SIGINT');
    await Promise.resolve();

    expect(subscription.close).toHaveBeenCalled();
    expect(pool.end).toHaveBeenCalled();
    expect(pubsub.close).toHaveBeenCalled();
    expect(datastore.close).toHaveBeenCalled();
  });

  it('logs and exits on failure', async () => {
    const pool = {};
    const datastore = {};
    const pubsub = {};
    const error = new Error('fail');
    mocks.getPool.mockReturnValue(pool);
    mocks.getDatastore.mockReturnValue(datastore);
    mocks.getPubSub.mockReturnValue(pubsub);
    mocks.startSubscriber.mockRejectedValue(error);
    mocks.GenerateReportUseCase.mockReturnValue({});

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    await import('./main');
    await Promise.resolve();

    expect(mocks.startSubscriber).toHaveBeenCalled();
    expect(mocks.loggerError).toHaveBeenCalledWith({ err: 'fail' }, 'Failed to start aggregator');
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });
});
