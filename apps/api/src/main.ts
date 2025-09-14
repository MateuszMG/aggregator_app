import { createApp } from './app';
import * as shared from 'shared';
import type { Closable } from 'shared';

const app = createApp();
const port = Number(process.env.PORT ?? 3001);
const server = app.listen(port, () => {
  shared.logger.info(`API listening on port ${port}`);
});

const resources: Closable[] = [
  {
    name: 'HTTP server',
    close: () =>
      new Promise<void>((resolve) =>
        server.close(() => {
          shared.logger.info('HTTP server closed');
          resolve();
        }),
      ),
  },
  { name: 'database pool', close: () => shared.getPool().end() },
  { name: 'Pub/Sub client', close: () => shared.getPubSub().close() },
  { name: 'Datastore client', close: () => shared.getDatastore().close() },
];

process.on('SIGINT', () => {
  void shared.gracefulShutdown('SIGINT', resources);
});
process.on('SIGTERM', () => {
  void shared.gracefulShutdown('SIGTERM', resources);
});
