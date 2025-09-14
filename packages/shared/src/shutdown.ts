import { logger } from './logger';

export interface Closable {
  name: string;
  close: () => Promise<void>;
}

export const gracefulShutdown = async (signal: NodeJS.Signals, resources: Closable[]): Promise<void> => {
  logger.info({ signal }, 'Shutdown signal received');
  try {
    await Promise.all(
      resources.map((resource) =>
        resource.close().catch((err) => {
          logger.error({ err: err instanceof Error ? err.message : String(err) }, `Failed to close ${resource.name}`);
        }),
      ),
    );
    logger.info('Cleanup complete');
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, 'Shutdown failed');
  }
};
