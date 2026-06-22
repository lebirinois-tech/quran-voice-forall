// Offline-first Tafsir provider.
// Two static JSON files are shipped with the app under /data:
//   - tafsir-muyassar-ar.json  (Tafsir Al-Muyassar, Arabic, ~2.5 MB)
//   - tafsir-montada-fr.json   (Traduction explicative Al-Montada, FR, ~1.2 MB)
// Both are precached by the service worker so they are available without network.
//
// Structure: { [surah: string]: { [verse: string]: string } }

type SurahMap = Record<string, Record<string, string>>;

const URLS: Record<'ar' | 'fr', string> = {
  ar: '/data/tafsir-muyassar-ar.json',
  fr: '/data/tafsir-montada-fr.json',
};

const memCache: Partial<Record<'ar' | 'fr', SurahMap>> = {};
const inflight: Partial<Record<'ar' | 'fr', Promise<SurahMap | null>>> = {};

async function loadLang(lang: 'ar' | 'fr'): Promise<SurahMap | null> {
  if (memCache[lang]) return memCache[lang]!;
  if (inflight[lang]) return inflight[lang]!;

  const p = (async () => {
    try {
      const res = await fetch(URLS[lang], { cache: 'force-cache' });
      if (!res.ok) return null;
      const data = (await res.json()) as SurahMap;
      memCache[lang] = data;
      return data;
    } catch (e) {
      console.warn('[offlineTafsir] load failed', lang, e);
      return null;
    } finally {
      delete inflight[lang];
    }
  })();
  inflight[lang] = p;
  return p;
}

export async function getOfflineTafsir(
  surah: number,
  verse: number,
  lang: 'ar' | 'fr',
): Promise<string | null> {
  const map = await loadLang(lang);
  return map?.[String(surah)]?.[String(verse)] ?? null;
}

/** Synchronous accessor; returns null if the file has not been loaded yet. */
export function getOfflineTafsirSync(
  surah: number,
  verse: number,
  lang: 'ar' | 'fr',
): string | null {
  return memCache[lang]?.[String(surah)]?.[String(verse)] ?? null;
}

/** Preload both datasets so they are cached by the service worker and ready offline. */
export function preloadOfflineTafsir(): void {
  if (typeof window === 'undefined') return;
  // Stagger slightly to avoid competing with first paint.
  setTimeout(() => { void loadLang('ar'); }, 1500);
  setTimeout(() => { void loadLang('fr'); }, 3000);
}