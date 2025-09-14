import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export const register = new Registry();
collectDefaultMetrics({ register });

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const pubsubMessagesPublished = new Counter({
  name: 'pubsub_messages_published_total',
  help: 'Total number of Pub/Sub messages published',
  labelNames: ['topic'],
  registers: [register],
});
