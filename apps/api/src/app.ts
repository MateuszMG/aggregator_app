import express from 'express';
import { PubSub } from '@google-cloud/pubsub';
import { Datastore } from '@google-cloud/datastore';
import { Pool } from 'pg';
import { buildReportId, monthlyReportSchema, reportFiltersSchema, availableMonthsSchema, PUBSUB_TOPICS } from 'shared';
import { appLimiter } from '../../../packages/shared/src/middleware/rateLimiter';

const app = express();
app.use(express.json());

app.use('/', appLimiter);

const projectId = process.env.GCLOUD_PROJECT || 'local-dev';
const pubsub = new PubSub({ projectId });
const datastore = new Datastore({ projectId });
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });

app.use('/health_check', (_req, res) => {
  console.log('ok');
  res.json({ msg: 'ok health_check' });
});

app.get('/api/reports/available-months', async (_req, res) => {
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
    console.error('Failed to fetch available months', err);
    res.status(500).send();
  }
});

app.post('/api/reports/generate', async (req, res) => {
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
    console.error('Failed to publish message', err);
    res.status(500).send();
  }
});

app.get('/api/reports/monthly/:year/:month', async (req, res) => {
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
    console.error('Failed to fetch report', err);
    res.status(500).send();
  }
});

export { app };
