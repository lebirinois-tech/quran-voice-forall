import type { TafsirSpeechLang } from './tafsirSpeech';

const DB = 'tafsir-tts-cache';
const STORE = 'clips';
let dbp: Promise<IDBDatabase | null> | null = null;
const openDb = () => dbp ??= new Promise(resolve => {
  if (typeof indexedDB === 'undefined') return resolve(null);
  const r = indexedDB.open(DB, 1);
  r.onupgradeneeded = () => r.result.createObjectStore(STORE);
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => resolve(null);
});
const getClip = async (k: string) => {
  const db = await openDb(); if (!db) return null;
  return new Promise<Blob | null>(res => {
    const q = db.transaction(STORE).objectStore(STORE).get(k);
    q.onsuccess = () => res(q.result instanceof Blob ? q.result : null);
    q.onerror = () => res(null);
  });
};
const putClip = async (k: string, b: Blob) => {
  const db = await openDb(); if (!db) return;
  db.transaction(STORE, 'readwrite').objectStore(STORE).put(b, k);
};

async function hash(s: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Long chunks keep natural intonation; the server accepts up to 1500 chars. */
export function splitCloudChunks(text: string, max = 900): string[] {
  const parts = text.replace(/\s+/g, ' ').trim().match(/[^.!?؟؛。]+[.!?؟؛。]*/gu) ?? [];
  const out: string[] = []; let buf = '';
  for (const p of parts) {
    const s = p.trim();
    if (buf && buf.length + s.length + 1 > max) { out.push(buf); buf = ''; }
    if (s.length > max) { for (let i = 0; i < s.length; i += max) out.push(s.slice(i, i + max)); continue; }
    buf = buf ? `${buf} ${s}` : s;
  }
  if (buf) out.push(buf);
  return out;
}

export class CloudSpeechError extends Error { constructor(msg: string, public status: number) { super(msg); } }

export async function fetchClip(text: string, lang: TafsirSpeechLang, signal: AbortSignal): Promise<Blob> {
  const key = await hash(`v1:${lang}:${text}`);
  const cached = await getClip(key);
  if (cached) return cached;
  const res = await fetch(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/tafsir-tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ text, lang }),
    signal,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = (await res.json()).error ?? msg; } catch { /* keep */ }
    throw new CloudSpeechError(msg, res.status);
  }
  const blob = await res.blob();
  if (!blob.size) throw new CloudSpeechError('empty audio', 502);
  putClip(key, blob);
  return blob;
}
