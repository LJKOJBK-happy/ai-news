import { JsonStorageAdapter } from './json-store.js';
import { SqliteStorageAdapter } from './sqlite-store.js';
import type { StorageAdapter } from './types.js';

export async function createStorage(): Promise<StorageAdapter> {
  const preferred = process.env.STORAGE_BACKEND ?? 'sqlite';

  if (preferred === 'json') {
    return new JsonStorageAdapter();
  }

  const sqlite = new SqliteStorageAdapter();
  if (await sqlite.healthCheck()) {
    return sqlite;
  }

  return new JsonStorageAdapter();
}
