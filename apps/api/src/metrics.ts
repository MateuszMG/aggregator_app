import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export const register = new Registry();
collectDefaultMetrics({ register });

register.removeSingleMetric('process_cpu_seconds_total');
register.removeSingleMetric('process_resident_memory_bytes');

export const processCpuSecondsTotal = new Gauge({
  name: 'process_cpu_seconds_total',
  help: 'Total user and system CPU time in seconds',
  registers: [register],
  collect() {
    const { user, system } = process.cpuUsage();
    this.set((user + system) / 1e6);
  },
});

export const processResidentMemoryBytes = new Gauge({
  name: 'process_resident_memory_bytes',
  help: 'Resident memory size in bytes',
  registers: [register],
  collect() {
    this.set(process.memoryUsage().rss);
  },
});

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
