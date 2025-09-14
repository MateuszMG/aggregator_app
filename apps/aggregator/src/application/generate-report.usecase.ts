import { monthlyReportSchema, MonthlyReport } from 'shared';
import type { OrderAggregates } from '../infrastructure/pg.orderRepository';

export interface OrderRepository {
  fetchOrders(year: number, month: number): Promise<OrderAggregates>;
}

export interface ReportRepository {
  save(report: MonthlyReport): Promise<void>;
}

export class GenerateReportUseCase {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly reportRepo: ReportRepository,
  ) {}

  async execute(year: number, month: number): Promise<void> {
    const { mechanicPerformance, weeklyThroughput } = await this.orderRepo.fetchOrders(year, month);

    const report = monthlyReportSchema.parse({
      year,
      month,
      mechanicPerformance,
      weeklyThroughput,
    });

    await this.reportRepo.save(report);
  }
}
