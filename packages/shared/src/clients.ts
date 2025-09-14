import { Pool } from 'pg';
import { PubSub } from '@google-cloud/pubsub';
import { Datastore } from '@google-cloud/datastore';
import { createClient, type RedisClientType } from 'redis';
import { logger } from './logger';

const projectId = process.env.GCLOUD_PROJECT || 'local-dev';
const connectionString = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';

let pool: Pool;
let pubsub: PubSub;
let datastore: Datastore;
let redis: RedisClientType;

export const getPool = (): Pool => {
  if (!pool) {
    pool = new Pool({ connectionString });
  }
  return pool;
};

export const getPubSub = (): PubSub => {
  if (!pubsub) {
    pubsub = new PubSub({ projectId });
  }
  return pubsub;
};

export const getDatastore = (): Datastore => {
  if (!datastore) {
    datastore = new Datastore({ projectId });
  }
  return datastore;
};

export const getRedis = (): RedisClientType => {
  if (!redis) {
    redis = createClient({ url: redisUrl });
    redis.on('error', (err) =>
      logger.error({ err: err instanceof Error ? err.message : String(err) }, 'Redis Client Error'),
    );
    redis
      .connect()
      .catch((err) =>
        logger.error({ err: err instanceof Error ? err.message : String(err) }, 'Redis connection failed'),
      );
  }
  return redis;
};
