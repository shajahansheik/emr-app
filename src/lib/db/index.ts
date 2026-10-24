import type { Store } from "./store";
import { PostgresStore } from "./postgres";
import { LocalStore } from "./local";

const g = globalThis as unknown as { __emrStore?: Store };

/**
 * Azure deployment (DATABASE_URL set) -> Azure Database for PostgreSQL.
 * Otherwise -> local data/db.json.
 */
export function getStore(): Store {
  if (!g.__emrStore) {
    const url = process.env.DATABASE_URL;
    g.__emrStore = url ? new PostgresStore(url) : new LocalStore();
  }
  return g.__emrStore;
}

export function isRunningOnAzure() {
  return Boolean(process.env.WEBSITE_SITE_NAME || process.env.WEBSITE_INSTANCE_ID);
}

export type { Store, StorageMode } from "./store";
