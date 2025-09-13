import { getDatastore, getPool, getPubSub } from 'shared';
import { startSubscriber } from './interface/pubsub.subscriber';
import { GenerateReportUseCase } from './application/generate-report.usecase';
import { fetchOrders } from './infrastructure/pg.orderRepository';
import { saveReport } from './infrastructure/datastore.reportRepository';
import { logger } from 'shared';

const main = async () => {
  const pool = getPool();
  const datastore = getDatastore();
  const pubsub = getPubSub();

  const useCase = new GenerateReportUseCase(
    { fetchOrders: (year, month) => fetchOrders(pool, year, month) },
    { save: (report) => saveReport(datastore, report) },
  );

  await startSubscriber(pubsub, useCase);
};

main().catch((err) => {
  logger.error({ err: err instanceof Error ? err.message : String(err) }, 'Failed to start aggregator');
  process.exit(1);
});
