import { describe, it, expect, vi } from 'vitest';
import { fetchOrders } from './pg.orderRepository';

describe('fetchOrders', () => {
  it('queries orders for the month range', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: 1 }] });
    const pool = { query } as any;
    const rows = await fetchOrders(pool, 2024, 1);
    expect(query).toHaveBeenCalledOnce();
    const args = query.mock.calls[0];
    expect(args[1][0]).toMatch('2024-01-01');
    expect(args[1][1]).toMatch('2024-02-01');
    expect(rows).toEqual([{ id: 1 }]);
  });

  it('throws when the query fails', async () => {
    const error = new Error('query fail');
    const query = vi.fn().mockRejectedValue(error);
    const pool = { query } as any;
    await expect(fetchOrders(pool, 2024, 1)).rejects.toThrow(error);
  });
});
