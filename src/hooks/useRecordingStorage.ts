import { useState, useCallback, useEffect } from 'react';

const DB_NAME = 'quran-recordings';
const STORE_NAME = 'recordings';
const DB_VERSION = 1;

interface RecordingEntry {
  id: string; // "surah:verse"
  blob: Blob;
  createdAt: number;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const useRecordingStorage = (surahNumber: number, verseNumber: number) => {
  const [savedRecording, setSavedRecording] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const key = `${surahNumber}:${verseNumber}`;

  // Load existing recording on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => {
          if (!cancelled) {
            const entry = req.result as RecordingEntry | undefined;
            setSavedRecording(entry?.blob ?? null);
            setIsLoading(false);
          }
        };
        req.onerror = () => { if (!cancelled) setIsLoading(false); };
      } catch {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [key]);

  const saveRecording = useCallback(async (blob: Blob) => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const entry: RecordingEntry = { id: key, blob, createdAt: Date.now() };
    store.put(entry);
    setSavedRecording(blob);
  }, [key]);

  const deleteRecording = useCallback(async () => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    setSavedRecording(null);
  }, [key]);

  return { savedRecording, saveRecording, deleteRecording, isLoading };
};
