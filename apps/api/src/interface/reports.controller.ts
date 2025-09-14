import { Router, Request, Response, NextFunction } from 'express';
import type { Sequelize } from 'sequelize';
import { QueryTypes } from 'sequelize';
import { Datastore } from '@google-cloud/datastore';
import { GenerateReportUseCase } from '../application/generate-report.usecase';
import {
  availableMonthsSchema,
  buildReportId,
  monthlyReportSchema,
  reportFiltersSchema,
  logger,
  envConfig,
} from 'shared';
import type { RedisClientType } from 'redis';
import { ValidationError, NotFoundError } from 'shared';

interface Deps {
  sequelize: Sequelize;
  datastore: Datastore;
  useCase: GenerateReportUseCase;
  redis: RedisClientType;
}

export const createReportsRouter = ({ sequelize, datastore, useCase, redis }: Deps): Router => {
  const router = Router();

  router.get('/available-months', async (_req: Request, res: Response, next: NextFunction) => {
    const cacheKey = 'available-months';
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const months = availableMonthsSchema.parse(JSON.parse(cached));
        return res.json(months);
      }
    } catch (err) {
      logger.error({ err: err instanceof Error ? err.message : String(err) }, 'Failed to retrieve months from cache');
    }
    try {
      const rows = await sequelize.query(
        `SELECT DISTINCT
           EXTRACT(YEAR FROM date_finished AT TIME ZONE 'UTC') AS year,
           EXTRACT(MONTH FROM date_finished AT TIME ZONE 'UTC') AS month
         FROM service_orders
         WHERE date_finished IS NOT NULL
         ORDER BY year, month`,
        { type: QueryTypes.SELECT },
      );
      const months = availableMonthsSchema.parse(
        (rows as any[]).map((r) => ({ year: Number(r.year), month: Number(r.month) })),
      );
      res.json(months);
      try {
        await redis.set(cacheKey, JSON.stringify(months), {
          EX: envConfig.REPORTS_CACHE_TTL_SECONDS,
        });
      } catch (err) {
        logger.error({ err: err instanceof Error ? err.message : String(err) }, 'Failed to store months in cache');
      }
    } catch (err) {
      logger.error({ err: err instanceof Error ? err.message : String(err) }, 'Failed to fetch available months');
      (err as any).logged = true;
      next(err);
    }
  });

  router.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
    const parsed = reportFiltersSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new ValidationError(parsed.error.format()));
    }
    try {
      await useCase.execute(parsed.data);
      res.status(202).send();
    } catch (err) {
      logger.error({ err: err instanceof Error ? err.message : String(err) }, 'Failed to publish message');
      (err as any).logged = true;
      next(err);
    }
  });

  router.get('/monthly/:year/:month', async (req: Request, res: Response, next: NextFunction) => {
    const parsed = reportFiltersSchema.safeParse({
      year: Number(req.params.year),
      month: Number(req.params.month),
    });
    if (!parsed.success) {
      return next(new ValidationError(parsed.error.format()));
    }
    const { year, month } = parsed.data;
    const cacheKey = `monthly:${year}-${month}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const report = monthlyReportSchema.parse(JSON.parse(cached));
        return res.json(report);
      }
    } catch (err) {
      logger.error({ err: err instanceof Error ? err.message : String(err) }, 'Failed to retrieve report from cache');
    }
    const key = datastore.key(['MonthlyReport', buildReportId({ year, month })]);
    try {
      const [entity] = await datastore.get(key);
      if (!entity) {
        return next(new NotFoundError('Report not found'));
      }
      const report = monthlyReportSchema.parse(entity);
      res.json(report);
      try {
        await redis.set(cacheKey, JSON.stringify(report), {
          EX: envConfig.REPORTS_CACHE_TTL_SECONDS,
        });
      } catch (err) {
        logger.error({ err: err instanceof Error ? err.message : String(err) }, 'Failed to store report in cache');
      }
    } catch (err) {
      logger.error({ err: err instanceof Error ? err.message : String(err) }, 'Failed to fetch report');
      (err as any).logged = true;
      next(err);
    }
  });

  return router;
};
