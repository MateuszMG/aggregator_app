import express from 'express';
import { PubSub } from '@google-cloud/pubsub';
import { Datastore } from '@google-cloud/datastore';
import { buildReportId, monthlyReportSchema, reportFiltersSchema, PUBSUB_TOPICS } from 'shared';

const app = express();
app.use(express.json());

const projectId = process.env.GCLOUD_PROJECT || 'local-dev';
const pubsub = new PubSub({ projectId });
const datastore = new Datastore({ projectId });

app.use('/health_check', (_req, res) => {
  console.log('ok');
  res.json({ msg: 'ok health_check' });
});

app.get('/api/reports/available-months', (_req, res) => {
  // TODO: query PostgreSQL for available months
  res.json([]);
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
