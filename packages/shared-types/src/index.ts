import { z } from 'zod';

export const reportFiltersSchema = z.object({
  year: z.number().int().min(1980).max(2100),
  month: z.number().int().min(1).max(12),
});
export type ReportFiltersSchema = z.infer<typeof reportFiltersSchema>;
