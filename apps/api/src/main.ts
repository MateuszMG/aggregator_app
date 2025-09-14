import { createApp } from './app';
import { getPool, getPubSub, getDatastore, logger, envConfig, gracefulShutdown, type Closable } from 'shared';

const app = createApp();
const server = app.listen(envConfig.PORT, () => {
  logger.info(`API listening on port ${envConfig.PORT}`);
});

const resources: Closable[] = [
  {
    name: 'HTTP server',
    close: () =>
      new Promise<void>((resolve) =>
        server.close(() => {
          logger.info('HTTP server closed');
          resolve();
        }),
      ),
  },
  { name: 'database pool', close: () => getPool().end() },
  { name: 'Pub/Sub client', close: () => getPubSub().close() },
  { name: 'Datastore client', close: () => getDatastore().close() },
];

process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT', resources);
});
process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM', resources);
});
