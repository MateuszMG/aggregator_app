import express from 'express';

const app = express();
app.use(express.json());

app.use('/health_check', (req, res) => {
  console.log('ok');
  res.json({ msg: 'ok health_check' });
});

app.get('/api/reports/available-months', (_req, res) => {
  // TODO: query PostgreSQL for available months
  res.json([]);
});

app.post('/api/reports/generate', (_req, res) => {
  // TODO: publish message to Pub/Sub
  res.status(202).send();
});

app.get('/api/reports/monthly/:year/:month', (_req, res) => {
  // TODO: fetch report from Datastore
  res.status(404).send();
});

export { app };
