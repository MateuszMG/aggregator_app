import { describe, it, expect, vi } from 'vitest';
import { saveReport } from './datastore.reportRepository';

describe('saveReport', () => {
  it('saves report with generated key', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const key = vi.fn().mockReturnValue('the-key');
    const datastore = { key, save } as any;
    const report = { year: 2024, month: 5, mechanicPerformance: {}, weeklyThroughput: {} } as any;
    await saveReport(datastore, report);
    expect(key).toHaveBeenCalledWith(['MonthlyReport', 'report-2024-05']);
    expect(save).toHaveBeenCalledWith({ key: 'the-key', data: report });
  });

  it('throws when datastore save fails', async () => {
    const error = new Error('save fail');
    const save = vi.fn().mockRejectedValue(error);
    const key = vi.fn().mockReturnValue('the-key');
    const datastore = { key, save } as any;
    const report = { year: 2024, month: 5, mechanicPerformance: {}, weeklyThroughput: {} } as any;
    await expect(saveReport(datastore, report)).rejects.toThrow(error);
  });
});
