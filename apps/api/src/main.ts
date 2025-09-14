import { createApp } from './app';
import * as shared from 'shared';
import type { Closable } from 'shared';

const main = async () => {
  await shared.initTelemetry();

  const app = createApp();
  const server = app.listen(shared.envConfig.API_PORT, () => {
    shared.logger.info(`API listening on port ${shared.envConfig.API_PORT}`);
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
    { name: 'database', close: () => shared.getSequelize().close() },
    { name: 'Pub/Sub client', close: () => shared.getPubSub().close() },
    { name: 'Datastore client', close: () => shared.getDatastore().close() },
  ];

  process.on('SIGINT', () => {
    void shared.gracefulShutdown('SIGINT', resources);
  });
  process.on('SIGTERM', () => {
    void shared.gracefulShutdown('SIGTERM', resources);
  });
};

void main();
