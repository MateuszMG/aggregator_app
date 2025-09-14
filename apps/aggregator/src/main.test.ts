import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  getPool: vi.fn(),
  getDatastore: vi.fn(),
  getPubSub: vi.fn(),
  loggerError: vi.fn(),
  startSubscriber: vi.fn(),
  GenerateReportUseCase: vi.fn(),
  fetchOrders: vi.fn(),
  saveReport: vi.fn(),
}));

vi.mock('shared', () => ({
  getPool: mocks.getPool,
  getDatastore: mocks.getDatastore,
  getPubSub: mocks.getPubSub,
  logger: { error: mocks.loggerError },
}));
vi.mock('./interface/pubsub.subscriber', () => ({ startSubscriber: mocks.startSubscriber }));
vi.mock('./application/generate-report.usecase', () => ({ GenerateReportUseCase: mocks.GenerateReportUseCase }));
vi.mock('./infrastructure/pg.orderRepository', () => ({ fetchOrders: mocks.fetchOrders }));
vi.mock('./infrastructure/datastore.reportRepository', () => ({ saveReport: mocks.saveReport }));

describe('main', () => {
  beforeEach(() => {
    vi.resetModules();
    Object.values(mocks).forEach((m) => 'mockReset' in m && m.mockReset());
  });

  it('starts subscriber successfully', async () => {
    const pool = {};
    const datastore = {};
    const pubsub = {};
    mocks.getPool.mockReturnValue(pool);
    mocks.getDatastore.mockReturnValue(datastore);
    mocks.getPubSub.mockReturnValue(pubsub);
    mocks.startSubscriber.mockResolvedValue(undefined);
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
