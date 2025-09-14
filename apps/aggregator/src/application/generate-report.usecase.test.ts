import { describe, it, expect, vi } from 'vitest';
import { GenerateReportUseCase } from './generate-report.usecase';

describe('GenerateReportUseCase', () => {
  it('aggregates orders and saves report', async () => {
    const orders = [
      { mechanic_id: 'm1', hours_spent: 2, service_name: 'oil', date_finished: '2024-01-02T00:00:00.000Z' },
      { mechanic_id: 'm1', hours_spent: 4, service_name: 'tire', date_finished: '2024-01-03T00:00:00.000Z' },
      { mechanic_id: 'm2', hours_spent: 3, service_name: 'oil', date_finished: '2024-01-08T00:00:00.000Z' },
    ];
    const orderRepo = { fetchOrders: vi.fn().mockResolvedValue(orders) };
    const save = vi.fn().mockResolvedValue(undefined);
    const usecase = new GenerateReportUseCase(orderRepo, { save });

    await usecase.execute(2024, 1);

    expect(orderRepo.fetchOrders).toHaveBeenCalledWith(2024, 1);
    expect(save).toHaveBeenCalledOnce();
    const report = save.mock.calls[0][0];
    expect(report).toMatchObject({
      year: 2024,
      month: 1,
      mechanicPerformance: {
        m1: {
          totalOrders: 2,
          averageHoursPerOrder: 3,
          servicesBreakdown: { oil: 1, tire: 1 },
        },
        m2: {
          totalOrders: 1,
          averageHoursPerOrder: 3,
          servicesBreakdown: { oil: 1 },
        },
      },
    });
    expect(report.weeklyThroughput).toEqual({ '2024-01': 2, '2024-02': 1 });
  });

  it('throws when fetching orders fails', async () => {
    const error = new Error('db fail');
    const orderRepo = { fetchOrders: vi.fn().mockRejectedValue(error) } as any;
    const save = vi.fn();
    const usecase = new GenerateReportUseCase(orderRepo, { save });

    await expect(usecase.execute(2024, 1)).rejects.toThrow(error);
    expect(save).not.toHaveBeenCalled();
  });

  it('throws when saving report fails', async () => {
    const orders: any[] = [];
    const orderRepo = { fetchOrders: vi.fn().mockResolvedValue(orders) } as any;
    const error = new Error('save fail');
    const save = vi.fn().mockRejectedValue(error);
    const usecase = new GenerateReportUseCase(orderRepo, { save });

    await expect(usecase.execute(2024, 1)).rejects.toThrow(error);
    expect(orderRepo.fetchOrders).toHaveBeenCalledWith(2024, 1);
  });
});
