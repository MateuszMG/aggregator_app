import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('gracefulShutdown', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('closes all resources and logs success', async () => {
    const info = vi.fn();
    const error = vi.fn();
    vi.doMock('../middleware/logger', () => ({ logger: { info, error } }));
    const { gracefulShutdown } = await import('./shutdown');

    const res1 = { name: 'res1', close: vi.fn().mockResolvedValue(undefined) };
    const res2 = { name: 'res2', close: vi.fn().mockResolvedValue(undefined) };

    await gracefulShutdown('SIGTERM', [res1, res2]);

    expect(res1.close).toHaveBeenCalledTimes(1);
    expect(res2.close).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith({ signal: 'SIGTERM' }, 'Shutdown signal received');
    expect(info).toHaveBeenCalledWith('Cleanup complete');
    expect(error).not.toHaveBeenCalled();
  });

  it('logs errors for failing resources but completes', async () => {
    const info = vi.fn();
    const error = vi.fn();
    vi.doMock('../middleware/logger', () => ({ logger: { info, error } }));
    const { gracefulShutdown } = await import('./shutdown');

    const ok = { name: 'ok', close: vi.fn().mockResolvedValue(undefined) };
    const bad = { name: 'bad', close: vi.fn().mockRejectedValue(new Error('oops')) };

    await gracefulShutdown('SIGINT', [ok, bad]);

    expect(ok.close).toHaveBeenCalledTimes(1);
    expect(bad.close).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith({ err: 'oops' }, 'Failed to close bad');
    expect(info).toHaveBeenCalledWith('Cleanup complete');
  });

  it('logs shutdown failure on unexpected errors', async () => {
    const info = vi.fn();
    const error = vi.fn();
    vi.doMock('../middleware/logger', () => ({ logger: { info, error } }));
    const { gracefulShutdown } = await import('./shutdown');

    const bad = {
      name: 'sync',
      close: vi.fn(() => {
        throw new Error('sync fail');
      }),
    };

    await gracefulShutdown('SIGTERM', [bad]);

    expect(bad.close).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith({ err: 'sync fail' }, 'Shutdown failed');
    expect(info).toHaveBeenCalledWith({ signal: 'SIGTERM' }, 'Shutdown signal received');
    expect(info).not.toHaveBeenCalledWith('Cleanup complete');
  });
});
