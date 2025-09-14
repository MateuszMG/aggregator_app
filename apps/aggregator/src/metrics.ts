import { Counter, Gauge, Registry, collectDefaultMetrics } from 'prom-client';

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

export const pubsubMessagesProcessed = new Counter({
  name: 'pubsub_messages_processed_total',
  help: 'Total number of Pub/Sub messages processed',
  registers: [register],
});
