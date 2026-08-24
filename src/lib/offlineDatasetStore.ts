/**
 * Stockage hors ligne des jeux de données volumineux (Warsh, Qalun…).
 *
 * Les fichiers Warsh/Qalun font ~2,8 Mo chacun : le quota localStorage (~5 Mo)
 * est dépassé dès qu'on en stocke deux. IndexedDB n'a pas cette limite.
 */

const DB_NAME = 'quran-offline-datasets';
const DB_VERSION = 1;
const STORE = 'datasets';

let dbPromise: Promise<IDBDatabase | null> | null = null;

const openDb = (): Promise<IDBDatabase | null> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
};

export const getDataset = async <T>(key: string): Promise<T | null> => {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

export const putDataset = async (key: string, value: unknown): Promise<boolean> => {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const t = db.transaction(STORE, 'readwrite');
      t.objectStore(STORE).put(value, key);
      // On attend la validation de la transaction : sinon un « succès »
      // pourrait être annoncé alors que rien n'est réellement écrit.
      t.oncomplete = () => resolve(true);
      t.onerror = () => resolve(false);
      t.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
};

export const hasDataset = async (key: string): Promise<boolean> =>
  (await getDataset(key)) !== null;
