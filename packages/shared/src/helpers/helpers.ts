import { ReportFilters } from '../validations/validations';

/**
 * Utility for building the identifier of a monthly report entity.
 */
export const buildReportId = ({ year, month }: ReportFilters): string => {
  return `report-${year}-${String(month).padStart(2, '0')}`;
};
