import { describe, it, expect, vi } from 'vitest';
import { fetchOrders } from './sequelize.orderRepository';

describe('fetchOrders', () => {
  it('queries aggregated orders for the month range', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ mechanic_performance: { m1: { totalOrders: 1 } } }])
      .mockResolvedValueOnce([{ weekly_throughput: { '2024-01': 1 } }]);
    const sequelize = { query } as any;
    const result = await fetchOrders(sequelize, 2024, 1);
    expect(query).toHaveBeenCalledTimes(2);
    const args1 = query.mock.calls[0];
    const args2 = query.mock.calls[1];
    expect(args1[1].replacements[0]).toMatch('2024-01-01');
    expect(args1[1].replacements[1]).toMatch('2024-02-01');
    expect(args1[0]).toContain("so.date_finished AT TIME ZONE 'UTC' >= $1");
    expect(args1[0]).toContain("so.date_finished AT TIME ZONE 'UTC' < $2");
    expect(args2[1].replacements[0]).toMatch('2024-01-01');
    expect(args2[1].replacements[1]).toMatch('2024-02-01');
    expect(result).toEqual({
      mechanicPerformance: { m1: { totalOrders: 1 } },
      weeklyThroughput: { '2024-01': 1 },
    });
  });

  it('uses UTC weeks for weekly throughput', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ mechanic_performance: {} }])
      .mockResolvedValueOnce([{ weekly_throughput: {} }]);
    const sequelize = { query } as any;
    await fetchOrders(sequelize, 2024, 1);
    const weeklyQuery = query.mock.calls[1][0] as string;
    expect(weeklyQuery).toContain("to_char(date_finished AT TIME ZONE 'UTC', 'IYYY-IW')");
    expect(weeklyQuery).toContain("date_finished AT TIME ZONE 'UTC' >= $1");
    expect(weeklyQuery).toContain("date_finished AT TIME ZONE 'UTC' < $2");
  });

  it('throws when the query fails', async () => {
    const error = new Error('query fail');
    const query = vi.fn().mockRejectedValue(error);
    const sequelize = { query } as any;
    await expect(fetchOrders(sequelize, 2024, 1)).rejects.toThrow(error);
  });
});
