import { describe, it, expect } from 'vitest';
import { reportFiltersSchema, availableMonthsSchema, monthlyReportSchema } from './validations';

describe('validations', () => {
  it('parses report filters', () => {
    const filters = reportFiltersSchema.parse({ year: 2024, month: 5 });
    expect(filters).toEqual({ year: 2024, month: 5 });
  });

  it('rejects invalid month', () => {
    expect(() => reportFiltersSchema.parse({ year: 2024, month: 13 })).toThrow();
  });

  it('rejects invalid year', () => {
    expect(() => reportFiltersSchema.parse({ year: 1979, month: 5 })).toThrow();
  });

  it('parses available months', () => {
    const months = availableMonthsSchema.parse([{ year: 2023, month: 12 }]);
    expect(months).toEqual([{ year: 2023, month: 12 }]);
  });

  it('parses monthly report', () => {
    const report = monthlyReportSchema.parse({
      year: 2024,
      month: 1,
      mechanicPerformance: {
        m1: {
          totalOrders: 2,
          averageHoursPerOrder: 1,
          servicesBreakdown: { oil: 2 },
        },
      },
      weeklyThroughput: { '2024-01': 2 },
    });
    expect(report.year).toBe(2024);
  });

  it('rejects invalid monthly report', () => {
    expect(() =>
      monthlyReportSchema.parse({
        year: 2024,
        month: 1,
        mechanicPerformance: {
          m1: {
            totalOrders: -1,
            averageHoursPerOrder: 1,
            servicesBreakdown: {},
          },
        },
        weeklyThroughput: {},
      }),
    ).toThrow();
  });
});
