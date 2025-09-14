import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { appLimiter } from './middleware/rateLimiter';
import { createReportsRouter } from './interface/reports.controller';
import { createHealthRouter } from './interface/health.controller';
import { PubSubPublisher } from './infrastructure/pubsub.publisher';
import { GenerateReportUseCase } from './application/generate-report.usecase';
import { getSequelize, getDatastore, getPubSub, getRedis, envConfig } from 'shared';
import { logger } from 'shared';
import { openApiHandler, openApiSchema } from './openapi';
import { httpRequestDuration, register } from './metrics';
import { HttpError, ValidationError, NotFoundError } from './errors';

export const createApp = () => {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: envConfig.REQUEST_BODY_LIMIT }));
  app.use('/', appLimiter());
  app.use(helmet());
  app.use(cors({ origin: envConfig.ALLOWED_ORIGINS }));

  app.use((req, res, next) => {
    const end = httpRequestDuration.startTimer({ method: req.method, route: req.path });
    res.on('finish', () => {
      end({ status_code: res.statusCode });
    });
    next();
  });

  const sequelize = getSequelize();
  const datastore = getDatastore();
  const pubsub = getPubSub();
  const redis = getRedis();
  const publisher = new PubSubPublisher(pubsub);
  const useCase = new GenerateReportUseCase(publisher);

  app.use('/health_check', createHealthRouter({ sequelize, datastore, pubsub, redis }));

  app.use('/api/reports', createReportsRouter({ sequelize, datastore, useCase, redis }));

  if (process.env.NODE_ENV !== 'production') {
    app.get('/metrics', async (_req: Request, res: Response) => {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    });

    app.get('/openapi.json', openApiHandler);

    import('swagger-ui-express')
      .then(({ serve, setup }) => {
        app.use('/docs', serve, setup(openApiSchema));
      })
      .catch(() => {});
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (!err.logged && !(err instanceof HttpError)) {
      logger.error({ err: err instanceof Error ? err.message : String(err) });
    }

    if (err instanceof ValidationError) {
      return res.status(400).json({ errors: err.details });
    }

    if (err instanceof NotFoundError) {
      return res.status(404).json({ error: err.message });
    }

    res.status(500).json({ error: 'Internal Server Error' });
  });

  return app;
};
