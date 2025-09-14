import { describe, it, expect, vi } from 'vitest';
import { GenerateReportUseCase } from './generate-report.usecase';

describe('GenerateReportUseCase', () => {
  it('saves report with aggregated data', async () => {
    const aggregates = {
      mechanicPerformance: {
        m1: { totalOrders: 2, averageHoursPerOrder: 3, servicesBreakdown: { oil: 1, tire: 1 } },
        m2: { totalOrders: 1, averageHoursPerOrder: 3, servicesBreakdown: { oil: 1 } },
      },
      weeklyThroughput: { '2024-01': 2, '2024-02': 1 },
    };
    const orderRepo = { fetchOrders: vi.fn().mockResolvedValue(aggregates) };
    const save = vi.fn().mockResolvedValue(undefined);
    const usecase = new GenerateReportUseCase(orderRepo, { save });

    await usecase.execute(2024, 1);

    expect(orderRepo.fetchOrders).toHaveBeenCalledWith(2024, 1);
    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith({ year: 2024, month: 1, ...aggregates });
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
    const orderRepo = {
      fetchOrders: vi.fn().mockResolvedValue({ mechanicPerformance: {}, weeklyThroughput: {} }),
    } as any;
    const error = new Error('save fail');
    const save = vi.fn().mockRejectedValue(error);
    const usecase = new GenerateReportUseCase(orderRepo, { save });

    await expect(usecase.execute(2024, 1)).rejects.toThrow(error);
    expect(orderRepo.fetchOrders).toHaveBeenCalledWith(2024, 1);
  });
});
