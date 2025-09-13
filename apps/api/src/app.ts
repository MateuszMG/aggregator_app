import express, { NextFunction, Request, Response } from 'express';
import {
  buildReportId,
  monthlyReportSchema,
  reportFiltersSchema,
  availableMonthsSchema,
  PUBSUB_TOPICS,
  getPubSub,
  getDatastore,
  getPool,
} from 'shared';
import { appLimiter } from './middleware/rateLimiter';
import helmet from 'helmet';
import cors from 'cors';
import { logger } from './middleware/logger';

const app = express();
app.disable('x-powered-by');
app.use(express.json());

app.use('/', appLimiter);
app.use(helmet());
app.use(cors({ origin: true }));

const pubsub = getPubSub();
const datastore = getDatastore();
const pool = getPool();

app.use('/health_check', (req: Request, res: Response) => {
  logger.info('ok');
  res.json({ msg: 'ok health_check' });
});

app.get('/api/reports/available-months', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT
         EXTRACT(YEAR FROM date_finished AT TIME ZONE 'UTC') AS year,
         EXTRACT(MONTH FROM date_finished AT TIME ZONE 'UTC') AS month
       FROM service_orders
       WHERE date_finished IS NOT NULL
       ORDER BY year, month`,
    );
    const months = availableMonthsSchema.parse(rows.map((r) => ({ year: Number(r.year), month: Number(r.month) })));
    res.json(months);
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, 'Failed to fetch available months');
    (err as any).logged = true;
    next(err);
  }
});

app.post('/api/reports/generate', async (req: Request, res: Response, next: NextFunction) => {
  const parsed = reportFiltersSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.format() });
  }
  const { year, month } = parsed.data;
  try {
    const [topic] = await pubsub.topic(PUBSUB_TOPICS.GENERATE_REPORT_REQUESTS).get({ autoCreate: true });
    await topic.publishMessage({ json: { year, month } });
    res.status(202).send();
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, 'Failed to publish message');
    (err as any).logged = true;
    next(err);
  }
});

app.get('/api/reports/monthly/:year/:month', async (req: Request, res: Response, next: NextFunction) => {
  const parsed = reportFiltersSchema.safeParse({
    year: Number(req.params.year),
    month: Number(req.params.month),
  });
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.format() });
  }
  const { year, month } = parsed.data;
  const key = datastore.key(['MonthlyReport', buildReportId({ year, month })]);
  try {
    const [entity] = await datastore.get(key);
    if (!entity) {
      return res.status(404).send();
    }
    const report = monthlyReportSchema.parse(entity);
    res.json(report);
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, 'Failed to fetch available months');
    (err as any).logged = true;
    next(err);
  }
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (!err.logged) {
    logger.error({ err: err instanceof Error ? err.message : String(err) });
  }
  res.status(500).json({ error: 'Internal Server Error' });
});

export { app };
