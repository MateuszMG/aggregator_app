import { describe, it, expect, vi } from 'vitest';
import { fetchOrders } from './pg.orderRepository';

describe('fetchOrders', () => {
  it('queries aggregated orders for the month range', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ mechanic_performance: { m1: { totalOrders: 1 } } }] })
      .mockResolvedValueOnce({ rows: [{ weekly_throughput: { '2024-01': 1 } }] });
    const pool = { query } as any;
    const result = await fetchOrders(pool, 2024, 1);
    expect(query).toHaveBeenCalledTimes(2);
    const args1 = query.mock.calls[0];
    const args2 = query.mock.calls[1];
    expect(args1[1][0]).toMatch('2024-01-01');
    expect(args1[1][1]).toMatch('2024-02-01');
    expect(args2[1][0]).toMatch('2024-01-01');
    expect(args2[1][1]).toMatch('2024-02-01');
    expect(result).toEqual({
      mechanicPerformance: { m1: { totalOrders: 1 } },
      weeklyThroughput: { '2024-01': 1 },
    });
  });

  it('throws when the query fails', async () => {
    const error = new Error('query fail');
    const query = vi.fn().mockRejectedValue(error);
    const pool = { query } as any;
    await expect(fetchOrders(pool, 2024, 1)).rejects.toThrow(error);
  });
});
