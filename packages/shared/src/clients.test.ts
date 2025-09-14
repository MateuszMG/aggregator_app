import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('clients', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.GCLOUD_PROJECT;
    delete process.env.DATABASE_URL;
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
    expect(PoolMock).toHaveBeenCalledWith({ connectionString: undefined });
  });

  it('creates a single pubsub client with projectId', async () => {
    process.env.GCLOUD_PROJECT = 'proj';
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
    process.env.GCLOUD_PROJECT = 'proj';
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
});
