import type { Storage } from './types.js';

let instance: Storage | null = null;
let initPromise: Promise<Storage> | null = null;

async function create(): Promise<Storage> {
  const url = process.env.DATABASE_URL?.trim();

  if (url) {
    const { PostgresStorage } = await import('./postgres.js');
    const storage = new PostgresStorage(url);
    await storage.init();
    return storage;
  }

  const { MemoryStorage } = await import('./memory.js');
  const storage = new MemoryStorage();
  await storage.init();
  return storage;
}

/**
 * Resolves the storage backend once per process.
 *
 * Postgres when DATABASE_URL is set, seeded in-memory otherwise. The promise
 * is cached so concurrent requests on a cold serverless instance share a
 * single initialisation rather than racing to seed.
 */
export async function getStorage(): Promise<Storage> {
  if (instance) return instance;
  initPromise ??= create().then((storage) => {
    instance = storage;
    return storage;
  });
  try {
    return await initPromise;
  } catch (error) {
    // Let the next request retry instead of caching a failed init forever.
    initPromise = null;
    throw error;
  }
}

/** Test seam: swap in a storage instance and bypass env detection. */
export function setStorageForTesting(storage: Storage | null): void {
  instance = storage;
  initPromise = storage ? Promise.resolve(storage) : null;
}

export type { Storage };
