import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { appLimiter } from './middleware/rateLimiter';
import { createReportsRouter } from './interface/reports.controller';
import { PubSubPublisher } from './infrastructure/pubsub.publisher';
import { GenerateReportUseCase } from './application/generate-report.usecase';
import { getPool, getDatastore, getPubSub } from 'shared';
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
  const publisher = new PubSubPublisher(pubsub);
  const useCase = new GenerateReportUseCase(publisher);

  app.use('/health_check', (_req: Request, res: Response) => {
    logger.info('ok');
    res.json({ msg: 'ok health_check' });
  });

  app.use('/api/reports', createReportsRouter({ pool, datastore, useCase }));

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (!err.logged) {
      logger.error({ err: err instanceof Error ? err.message : String(err) });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  });

  return app;
};
