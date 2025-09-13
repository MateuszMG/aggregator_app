import { Pool } from 'pg';
import { PubSub } from '@google-cloud/pubsub';
import { Datastore } from '@google-cloud/datastore';

const projectId = process.env.GCLOUD_PROJECT || 'local-dev';
const connectionString = process.env.DATABASE_URL;

let pool: Pool;
let pubsub: PubSub;
let datastore: Datastore;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString });
  }
  return pool;
}

export function getPubSub(): PubSub {
  if (!pubsub) {
    pubsub = new PubSub({ projectId });
  }
  return pubsub;
}

export function getDatastore(): Datastore {
  if (!datastore) {
    datastore = new Datastore({ projectId });
  }
  return datastore;
}
