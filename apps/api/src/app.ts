import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { appLimiter } from './middleware/rateLimiter';
import { createReportsRouter } from './interface/reports.controller';
import { PubSubPublisher } from './infrastructure/pubsub.publisher';
import { GenerateReportUseCase } from './application/generate-report.usecase';
import { getPool, getDatastore, getPubSub, getRedis, PUBSUB_TOPICS, getSubscriptionName } from 'shared';
import { logger } from 'shared';

export const createApp = () => {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());
  app.use('/', appLimiter);
  app.use(helmet());
  app.use(cors({ origin: true }));

  const pool = getPool();
  const datastore = getDatastore();
  const pubsub = getPubSub();
  const redis = getRedis();
  const publisher = new PubSubPublisher(pubsub);
  const useCase = new GenerateReportUseCase(publisher);

  app.use('/health_check', async (_req: Request, res: Response) => {
    const redisOk = await redis
      .ping()
      .then(() => true)
      .catch(() => false);

    const databaseOk = await pool
      .query('SELECT 1')
      .then(() => true)
      .catch(() => false);

    const pubsubOk = await pubsub
      .getTopics()
      .then(() => true)
      .catch(() => false);

    const datastoreOk = await datastore
      .get(datastore.key(['health', 'check']))
      .then(() => true)
      .catch(() => false);

    const gcpEmulatorOk = pubsubOk && datastoreOk;

    const aggregatorOk = await pubsub
      .topic(PUBSUB_TOPICS.GENERATE_REPORT_REQUESTS)
      .subscription(getSubscriptionName(PUBSUB_TOPICS.GENERATE_REPORT_REQUESTS))
      .exists()
      .then(([exists]) => exists)
      .catch(() => false);

    const allOk = redisOk && databaseOk && gcpEmulatorOk && aggregatorOk;

    if (!allOk) {
      logger.error({ redisOk, databaseOk, gcpEmulatorOk, aggregatorOk }, 'Health check failed');
      res.status(503);
    }

    res.json({
      redis: redisOk,
      database: databaseOk,
      gcpEmulator: gcpEmulatorOk,
      aggregator: aggregatorOk,
    });
  });

  app.use('/api/reports', createReportsRouter({ pool, datastore, useCase, redis }));

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (!err.logged) {
      logger.error({ err: err instanceof Error ? err.message : String(err) });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  });

  return app;
};
