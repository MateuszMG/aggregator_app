import { getDatastore, getPool, getPubSub, gracefulShutdown, type Closable } from 'shared';
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

  const subscription = await startSubscriber(pubsub, useCase);

  const resources: Closable[] = [
    { name: 'subscription', close: () => subscription.close() },
    { name: 'database pool', close: () => pool.end() },
    { name: 'Pub/Sub client', close: () => pubsub.close() },
    { name: 'Datastore client', close: () => datastore.close() },
  ];

  process.on('SIGINT', () => {
    void gracefulShutdown('SIGINT', resources);
  });
  process.on('SIGTERM', () => {
    void gracefulShutdown('SIGTERM', resources);
  });
};

main().catch((err) => {
  logger.error({ err: err instanceof Error ? err.message : String(err) }, 'Failed to start aggregator');
  process.exit(1);
});
