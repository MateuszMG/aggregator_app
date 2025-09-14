import http from 'http';
import { getDatastore, getPool, getPubSub, gracefulShutdown, envConfig, type Closable, initTelemetry } from 'shared';
import { startSubscriber } from './interface/pubsub.subscriber';
import { GenerateReportUseCase } from './application/generate-report.usecase';
import { fetchOrders } from './infrastructure/pg.orderRepository';
import { saveReport } from './infrastructure/datastore.reportRepository';
import { logger } from 'shared';
import { register } from './metrics';

const main = async () => {
  await initTelemetry();

  const pool = getPool();
  const datastore = getDatastore();
  const pubsub = getPubSub();

  const useCase = new GenerateReportUseCase(
    { fetchOrders: (year, month) => fetchOrders(pool, year, month) },
    { save: (report) => saveReport(datastore, report) },
  );

  const subscription = await startSubscriber(pubsub, useCase);

  const metricsServer = http.createServer(async (req, res) => {
    if (req.url === '/metrics') {
      res.writeHead(200, { 'Content-Type': register.contentType });
      res.end(await register.metrics());
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  const aggregatorPort = process.env.NODE_ENV === 'test' ? 0 : envConfig.AGGREGATOR_PORT;
  metricsServer.listen(aggregatorPort, () => {
    logger.info(`Metrics server listening on port ${aggregatorPort}`);
  });
  if (process.env.NODE_ENV === 'test') {
    metricsServer.unref();
  }

  const resources: Closable[] = [
    { name: 'subscription', close: () => subscription.close() },
    { name: 'database pool', close: () => pool.end() },
    { name: 'Pub/Sub client', close: () => pubsub.close() },
    { name: 'Datastore client', close: () => datastore.close() },
    { name: 'metrics server', close: () => new Promise((resolve) => metricsServer.close(resolve as any)) },
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
