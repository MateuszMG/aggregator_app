import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { Datastore } from '@google-cloud/datastore';
import { PubSub } from '@google-cloud/pubsub';
import type { RedisClientType } from 'redis';
import { PUBSUB_TOPICS, getSubscriptionName, logger } from 'shared';

interface Deps {
  pool: Pool;
  datastore: Datastore;
  pubsub: PubSub;
  redis: RedisClientType;
}

export const createHealthRouter = ({ pool, datastore, pubsub, redis }: Deps): Router => {
  const router = Router();

  router.get('/', async (_req: Request, res: Response) => {
    const redisOk = await redis
      .ping()
      .then(() => true)
      .catch(() => false);

    const databaseOk = await pool
      .query('SELECT 1')
      .then(() => true)
      .catch(() => false);

    const pubsubOk = await pubsub
      .getTopics()
      .then(() => true)
      .catch(() => false);

    const datastoreOk = await datastore
      .get(datastore.key(['health', 'check']))
      .then(() => true)
      .catch(() => false);

    const gcpEmulatorOk = pubsubOk && datastoreOk;

    const aggregatorOk = await pubsub
      .topic(PUBSUB_TOPICS.GENERATE_REPORT_REQUESTS)
      .subscription(getSubscriptionName(PUBSUB_TOPICS.GENERATE_REPORT_REQUESTS))
      .exists()
      .then(([exists]) => exists)
      .catch(() => false);

    const allOk = redisOk && databaseOk && gcpEmulatorOk && aggregatorOk;

    if (!allOk) {
      logger.error({ redisOk, databaseOk, gcpEmulatorOk, aggregatorOk }, 'Health check failed');
      res.status(503);
    }

    res.json({
      redis: redisOk,
      database: databaseOk,
      gcpEmulator: gcpEmulatorOk,
      aggregator: aggregatorOk,
    });
  });

  return router;
};
