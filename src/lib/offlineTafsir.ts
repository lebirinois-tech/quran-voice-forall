// Offline-first Tafsir provider. Bundled JSON files under /data, precached by the service worker.
// The user chooses one Tafsir source; Arabic text comes from that source and FR/EN from its
// official translation (Al-Mukhtasar FR/EN for Al-Mukhtasar and As-Sa'di, which has no FR/EN).
// Structure: { [surah: string]: { [verse: string]: string } }
import { useEffect, useState, useCallback } from 'react';

type SurahMap = Record<string, Record<string, string>>;
type Lang = 'ar' | 'fr' | 'en';
export type TafsirSource = 'muyassar' | 'mukhtasar' | 'saadi';

export const TAFSIR_SOURCES: { id: TafsirSource; ar: string; fr: string; en: string }[] = [
  { id: 'muyassar', ar: 'التفسير الميسر', fr: 'Al-Muyassar', en: 'Al-Muyassar' },
  { id: 'mukhtasar', ar: 'المختصر في التفسير', fr: 'Al-Mukhtasar', en: 'Al-Mukhtasar' },
  { id: 'saadi', ar: 'تفسير السعدي', fr: "As-Sa'di", en: "As-Sa'di" },
];

const FILES: Record<TafsirSource, Record<Lang, string>> = {
  muyassar: { ar: '/data/tafsir-muyassar-ar.json', fr: '/data/tafsir-montada-fr.json', en: '/data/tafsir-mukhtasar-en.json' },
  mukhtasar: { ar: '/data/tafsir-mukhtasar-ar.json', fr: '/data/tafsir-mukhtasar-fr.json', en: '/data/tafsir-mukhtasar-en.json' },
  saadi: { ar: '/data/tafsir-saadi-ar.json', fr: '/data/tafsir-mukhtasar-fr.json', en: '/data/tafsir-mukhtasar-en.json' },
};

const KEY = 'quran-tafsir-source';
const EVENT = 'quran-tafsir-source-change';

export function getTafsirSource(): TafsirSource {
  const v = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
  return v === 'mukhtasar' || v === 'saadi' ? v : 'muyassar';
}

export function setTafsirSource(s: TafsirSource) {
  localStorage.setItem(KEY, s);
  window.dispatchEvent(new Event(EVENT));
}

export function getTafsirSourceLabel(lang: Lang, s: TafsirSource = getTafsirSource()) {
  return TAFSIR_SOURCES.find(x => x.id === s)![lang];
}

export function useTafsirSource(): [TafsirSource, (s: TafsirSource) => void] {
  const [v, setV] = useState(getTafsirSource);
  useEffect(() => {
    const sync = () => setV(getTafsirSource());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);
  return [v, useCallback((s: TafsirSource) => setTafsirSource(s), [])];
}

const memCache: Record<string, SurahMap> = {};
const inflight: Record<string, Promise<SurahMap | null>> = {};

async function loadFile(url: string): Promise<SurahMap | null> {
  if (memCache[url]) return memCache[url];
  if (url in inflight) return inflight[url];
  const p = (async () => {
    try {
      const res = await fetch(url, { cache: 'force-cache' });
      if (!res.ok) return null;
      const data = (await res.json()) as SurahMap;
      memCache[url] = data;
      return data;
    } catch (e) {
      console.warn('[offlineTafsir] load failed', url, e);
      return null;
    } finally {
      delete inflight[url];
    }
  })();
  inflight[url] = p;
  return p;
}

export async function getOfflineTafsir(surah: number, verse: number, lang: Lang, source: TafsirSource = getTafsirSource()): Promise<string | null> {
  const map = await loadFile(FILES[source][lang]);
  return map?.[String(surah)]?.[String(verse)] ?? null;
}

/** Synchronous accessor; returns null if the file has not been loaded yet. */
export function getOfflineTafsirSync(surah: number, verse: number, lang: Lang): string | null {
  return memCache[FILES[getTafsirSource()][lang]]?.[String(surah)]?.[String(verse)] ?? null;
}

/** Preload the chosen source so it is cached by the service worker and ready offline. */
export function preloadOfflineTafsir(): void {
  if (typeof window === 'undefined') return;
  const files = FILES[getTafsirSource()];
  setTimeout(() => { void loadFile(files.ar); }, 1500);
  setTimeout(() => { void loadFile(files.fr); }, 3000);
  setTimeout(() => { void loadFile(files.en); }, 4500);
}
