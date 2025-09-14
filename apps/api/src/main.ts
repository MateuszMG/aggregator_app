import { createApp } from './app';
import { getPool, getPubSub, getDatastore, logger, gracefulShutdown, type Closable } from 'shared';

const port = Number(process.env.PORT) || 3001;
const app = createApp();
const server = app.listen(port, () => {
  logger.info(`API listening on port ${port}`);
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
