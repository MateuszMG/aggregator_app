import { getISOWeek, getISOWeekYear, parseISO } from 'date-fns';
import { monthlyReportSchema, MonthlyReport } from 'shared';
import type { OrderRecord } from '../infrastructure/pg.orderRepository';

export interface OrderRepository {
  fetchOrders(year: number, month: number): Promise<OrderRecord[]>;
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
    const orders = await this.orderRepo.fetchOrders(year, month);

    const mechanics: Record<
      string,
      { totalOrders: number; totalHours: number; servicesBreakdown: Record<string, number> }
    > = {};
    const weeklyThroughput: Record<string, number> = {};

    for (const row of orders) {
      const mechanicId = row.mechanic_id;
      const hours = Number(row.hours_spent);
      const serviceName = row.service_name;
      const finishedDate = typeof row.date_finished === 'string' ? parseISO(row.date_finished) : row.date_finished;

      if (!mechanics[mechanicId]) {
        mechanics[mechanicId] = {
          totalOrders: 0,
          totalHours: 0,
          servicesBreakdown: {},
        };
      }
      const mp = mechanics[mechanicId];
      mp.totalOrders += 1;
      mp.totalHours += hours;
      mp.servicesBreakdown[serviceName] = (mp.servicesBreakdown[serviceName] || 0) + 1;

      const weekKey = `${getISOWeekYear(finishedDate)}-${String(getISOWeek(finishedDate)).padStart(2, '0')}`;
      weeklyThroughput[weekKey] = (weeklyThroughput[weekKey] || 0) + 1;
    }

    const mechanicPerformance: Record<
      string,
      { totalOrders: number; averageHoursPerOrder: number; servicesBreakdown: Record<string, number> }
    > = {};

    for (const [id, data] of Object.entries(mechanics)) {
      mechanicPerformance[id] = {
        totalOrders: data.totalOrders,
        averageHoursPerOrder: data.totalOrders ? data.totalHours / data.totalOrders : 0,
        servicesBreakdown: data.servicesBreakdown,
      };
    }

    const report = monthlyReportSchema.parse({
      year,
      month,
      mechanicPerformance,
      weeklyThroughput,
    });

    await this.reportRepo.save(report);
  }
}
