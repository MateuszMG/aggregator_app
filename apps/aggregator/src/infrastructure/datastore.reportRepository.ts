import { Datastore } from '@google-cloud/datastore';
import { buildReportId, MonthlyReport } from 'shared';

export const saveReport = async (datastore: Datastore, report: MonthlyReport): Promise<void> => {
  const key = datastore.key(['MonthlyReport', buildReportId(report)]);
  await datastore.save({ key, data: report });
};
