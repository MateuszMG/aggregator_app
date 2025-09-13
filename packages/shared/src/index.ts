import { z } from 'zod';

/**
 * Common schema for selecting a report by year and month.
 */
export const reportFiltersSchema = z.object({
  year: z.number().int().min(1980).max(2100),
  month: z.number().int().min(1).max(12),
});
export type ReportFilters = z.infer<typeof reportFiltersSchema>;

const mechanicPerformanceSchema = z.object({
  totalOrders: z.number().int().nonnegative(),
  averageHoursPerOrder: z.number().nonnegative(),
  servicesBreakdown: z.record(z.number().int().nonnegative()),
});

/**
 * Schema describing a stored monthly report.
 */
export const monthlyReportSchema = z.object({
  year: reportFiltersSchema.shape.year,
  month: reportFiltersSchema.shape.month,
  mechanicPerformance: z.record(mechanicPerformanceSchema),
  weeklyThroughput: z.record(z.number().int().nonnegative()),
});
export type MonthlyReport = z.infer<typeof monthlyReportSchema>;

/**
 * Utility for building the identifier of a monthly report entity.
 */
export function buildReportId({ year, month }: ReportFilters): string {
  return `report-${year}-${String(month).padStart(2, '0')}`;
}

export { PUBSUB_TOPICS, getSubscriptionName, type PubSubTopic } from './pubsub';
