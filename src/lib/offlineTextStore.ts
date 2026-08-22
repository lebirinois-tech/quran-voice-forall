/**
 * Stockage hors ligne des textes du Coran (IndexedDB).
 *
 * localStorage ne peut pas contenir les 114 sourates (texte + traduction +
 * Tajweed dépassent largement le quota de ~5 Mo) : les téléchargements
 * échouaient silencieusement. IndexedDB n'a pas cette limite.
 */

export interface CachedSurahData {
  verses: Array<{ number: number; text: string; translation: string; page?: number }>;
  tajweed: Record<number, string>;
  timestamp: number;
}

const DB_NAME = 'quran-offline-text';
const DB_VERSION = 1;
const STORE = 'surahs';
const LEGACY_PREFIX = 'quran-offline-';

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

const tx = async <T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T | null> => {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const t = db.transaction(STORE, mode);
      const req = run(t.objectStore(STORE));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

const readLegacy = (surahNumber: number): CachedSurahData | null => {
  try {
    const raw = localStorage.getItem(`${LEGACY_PREFIX}${surahNumber}`);
    return raw ? (JSON.parse(raw) as CachedSurahData) : null;
  } catch {
    return null;
  }
};

export const getSurahText = async (surahNumber: number): Promise<CachedSurahData | null> => {
  const fromDb = await tx<CachedSurahData>('readonly', (s) => s.get(surahNumber));
  return fromDb ?? readLegacy(surahNumber);
};

export const putSurahText = async (surahNumber: number, data: CachedSurahData): Promise<boolean> => {
  const ok = await tx('readwrite', (s) => s.put(data, surahNumber));
  return ok !== null;
};

export const getCachedSurahNumbers = async (): Promise<number[]> => {
  const keys = await tx<IDBValidKey[]>('readonly', (s) => s.getAllKeys());
  const fromDb = (keys || []).map((k) => Number(k)).filter((n) => Number.isFinite(n));
  if (fromDb.length) return fromDb;
  const legacy: number[] = [];
  for (let i = 1; i <= 114; i++) {
    if (localStorage.getItem(`${LEGACY_PREFIX}${i}`)) legacy.push(i);
  }
  return legacy;
};

export const hasSurahText = async (surahNumber: number): Promise<boolean> =>
  (await getSurahText(surahNumber)) !== null;
