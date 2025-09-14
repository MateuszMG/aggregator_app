import { Counter, Registry, collectDefaultMetrics } from 'prom-client';

export const register = new Registry();
collectDefaultMetrics({ register });

export const pubsubMessagesProcessed = new Counter({
  name: 'pubsub_messages_processed_total',
  help: 'Total number of Pub/Sub messages processed',
  registers: [register],
});
