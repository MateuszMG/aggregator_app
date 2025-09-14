import { Sequelize } from 'sequelize';
import { PubSub } from '@google-cloud/pubsub';
import { Datastore } from '@google-cloud/datastore';
import { createClient, type RedisClientType } from 'redis';
import { logger } from '../middleware/logger';
import { envConfig } from '../config/config';

const projectId = envConfig.GCLOUD_PROJECT;
const connectionString = envConfig.DATABASE_URL;
const max = envConfig.PG_POOL_MAX;
const idleTimeoutMillis = envConfig.PG_POOL_IDLE;
const redisUrl = envConfig.REDIS_URL;

let sequelize: Sequelize;
let pubsub: PubSub;
let datastore: Datastore;
let redis: RedisClientType;

export const getSequelize = (): Sequelize => {
  if (!sequelize) {
    sequelize = new Sequelize(connectionString, {
      dialect: 'postgres',
      pool: { max, idle: idleTimeoutMillis },
      logging: false,
    });
  }
  return sequelize;
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
