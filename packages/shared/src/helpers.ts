import { ReportFilters } from './validations';

/**
 * Utility for building the identifier of a monthly report entity.
 */
export function buildReportId({ year, month }: ReportFilters): string {
  return `report-${year}-${String(month).padStart(2, '0')}`;
}
