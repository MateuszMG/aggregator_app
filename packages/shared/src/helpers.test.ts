import { describe, it, expect } from 'vitest';
import { buildReportId } from './helpers';

describe('buildReportId', () => {
  it('builds formatted report id', () => {
    expect(buildReportId({ year: 2024, month: 3 })).toBe('report-2024-03');
  });
});
