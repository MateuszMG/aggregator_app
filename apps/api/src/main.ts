import { createApp } from './app';
import { getPool, getPubSub, getDatastore, logger } from 'shared';

const port = Number(process.env.PORT) || 3001;
const app = createApp();
const server = app.listen(port, () => {
  logger.info(`API listening on port ${port}`);
});

const shutdown = async (signal: NodeJS.Signals) => {
  logger.info({ signal }, 'Shutdown signal received');
  await new Promise<void>((resolve) => server.close(() => resolve()));
  logger.info('HTTP server closed');

  try {
    await Promise.all([
      getPool()
        .end()
        .catch((err) =>
          logger.error({ err: err instanceof Error ? err.message : String(err) }, 'Failed to close database pool'),
        ),
      getPubSub()
        .close()
        .catch((err) =>
          logger.error({ err: err instanceof Error ? err.message : String(err) }, 'Failed to close Pub/Sub client'),
        ),
      getDatastore()
        .close()
        .catch((err: { message: string }) =>
          logger.error({ err: err instanceof Error ? err.message : String(err) }, 'Failed to close Datastore client'),
        ),
    ]);
    logger.info('Cleanup complete');
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, 'Shutdown failed');
  }
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
