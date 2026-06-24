// Offline-first Tafsir provider.
// Three static JSON files are shipped with the app under /data:
//   - tafsir-muyassar-ar.json   (Tafsir Al-Muyassar, Arabic, ~2.5 MB)
//   - tafsir-montada-fr.json    (Traduction explicative Al-Montada, FR, ~1.2 MB)
//   - tafsir-mukhtasar-en.json  (English Al-Mukhtasar, EN, ~1.8 MB)
// All are precached by the service worker so they are available without network.
//
// Structure: { [surah: string]: { [verse: string]: string } }

type SurahMap = Record<string, Record<string, string>>;

type Lang = 'ar' | 'fr' | 'en';

const URLS: Record<Lang, string> = {
  ar: '/data/tafsir-muyassar-ar.json',
  fr: '/data/tafsir-montada-fr.json',
  en: '/data/tafsir-mukhtasar-en.json',
};

const memCache: Partial<Record<Lang, SurahMap>> = {};
const inflight: Partial<Record<Lang, Promise<SurahMap | null>>> = {};

async function loadLang(lang: Lang): Promise<SurahMap | null> {
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
  lang: Lang,
): Promise<string | null> {
  const map = await loadLang(lang);
  return map?.[String(surah)]?.[String(verse)] ?? null;
}

/** Synchronous accessor; returns null if the file has not been loaded yet. */
export function getOfflineTafsirSync(
  surah: number,
  verse: number,
  lang: Lang,
): string | null {
  return memCache[lang]?.[String(surah)]?.[String(verse)] ?? null;
}

/** Preload all datasets so they are cached by the service worker and ready offline. */
export function preloadOfflineTafsir(): void {
  if (typeof window === 'undefined') return;
  // Stagger slightly to avoid competing with first paint.
  setTimeout(() => { void loadLang('ar'); }, 1500);
  setTimeout(() => { void loadLang('fr'); }, 3000);
  setTimeout(() => { void loadLang('en'); }, 4500);
}