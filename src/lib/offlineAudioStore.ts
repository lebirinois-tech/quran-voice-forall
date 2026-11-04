const DB_NAME = 'quran-offline-audio';
const DB_VERSION = 1;
const STORE = 'verses';

let dbPromise: Promise<IDBDatabase | null> | null = null;

const openDb = (): Promise<IDBDatabase | null> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
  return dbPromise;
};

const keyFor = (reciter: string, surah: number, verse: number) =>
  `${reciter}:${surah}:${verse}`;

export const putOfflineAudio = async (
  reciter: string,
  surah: number,
  verse: number,
  blob: Blob,
): Promise<boolean> => {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE, 'readwrite');
    const request = transaction.objectStore(STORE).put(blob, keyFor(reciter, surah, verse));
    let requestSucceeded = false;
    request.onsuccess = () => { requestSucceeded = true; };
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => resolve(false);
    transaction.onabort = () => resolve(false);
    request.onerror = () => {
      requestSucceeded = false;
    };
    transaction.oncomplete = () => resolve(requestSucceeded);
  });
};

export const getOfflineAudioUrl = async (
  reciter: string,
  surah: number,
  verse: number,
): Promise<string | null> => {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(keyFor(reciter, surah, verse));
    request.onsuccess = () => {
      const blob = request.result;
      resolve(blob instanceof Blob ? URL.createObjectURL(blob) : null);
    };
    request.onerror = () => resolve(null);
  });
};
/** Deletes stored clips for one reciter, or every reciter when omitted. */
export const clearOfflineAudio = async (reciter?: string): Promise<boolean> => {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE, 'readwrite');
    const store = transaction.objectStore(STORE);
    if (!reciter) store.clear();
    else {
      const prefix = `${reciter}:`;
      const range = IDBKeyRange.bound(prefix, `${prefix}\uffff`);
      store.delete(range);
    }
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => resolve(false);
    transaction.onabort = () => resolve(false);
  });
};

const ONLINE_ONLY_KEY = 'quran-audio-online-only';
export const isOnlineOnlyAudio = () =>
  typeof localStorage !== 'undefined' && localStorage.getItem(ONLINE_ONLY_KEY) === '1';
export const setOnlineOnlyAudio = (value: boolean) =>
  localStorage.setItem(ONLINE_ONLY_KEY, value ? '1' : '0');
