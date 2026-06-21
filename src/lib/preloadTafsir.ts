// Pré-chargement automatique du Tafsir Al-Muyassar (arabe) au 1er lancement.
// L'API alquran.cloud est gratuite et ne consomme pas de crédits IA.
// La traduction FR via l'edge function reste à la demande (utilise crédits).

const TAFSIR_CACHE_PREFIX = 'quran-tafsir-';
const TAFSIR_CACHE_STATUS = 'quran-tafsir-cache-status';
const PRELOAD_FLAG = 'quran-tafsir-preload-v1';
const PRELOAD_IN_PROGRESS = 'quran-tafsir-preload-running';

// Pré-traduction FR de Al-Muyassar via l'edge function translate-tafsir.
// S'exécute en arrière-plan, reprend là où elle s'est arrêtée,
// s'interrompt proprement en cas de 402 (crédits épuisés) ou 429 (rate limit).
const FR_CACHE_PREFIX = 'quran-tafsir-fr-';
const FR_STATUS_KEY = 'quran-tafsir-fr-status';
const FR_PRELOAD_FLAG = 'quran-tafsir-fr-preload-v1';
const FR_PRELOAD_IN_PROGRESS = 'quran-tafsir-fr-preload-running';

interface CacheStatus { [surah: number]: boolean }

const getStatus = (): CacheStatus => {
  try { return JSON.parse(localStorage.getItem(TAFSIR_CACHE_STATUS) || '{}'); }
  catch { return {}; }
};

const saveStatus = (s: CacheStatus) => {
  try { localStorage.setItem(TAFSIR_CACHE_STATUS, JSON.stringify(s)); } catch { /* quota */ }
};

async function downloadSurah(surah: number): Promise<boolean> {
  try {
    const res = await fetch(`https://api.alquran.cloud/v1/surah/${surah}/ar.muyassar`);
    const data = await res.json();
    if (data?.code !== 200 || !data?.data?.ayahs) return false;
    const map: Record<number, string> = {};
    for (const a of data.data.ayahs) map[a.numberInSurah] = a.text;
    localStorage.setItem(`${TAFSIR_CACHE_PREFIX}${surah}`, JSON.stringify(map));
    const status = getStatus();
    status[surah] = true;
    saveStatus(status);
    return true;
  } catch {
    return false;
  }
}

/**
 * Pré-charge le tafsir Al-Muyassar (arabe) pour les 114 sourates.
 * - Exécution en arrière-plan, non bloquante
 * - Reprend là où elle s'est arrêtée si interrompue
 * - Idempotente : marque un flag une fois terminée
 */
export function preloadAllTafsirInBackground() {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(PRELOAD_FLAG) === 'done') return;
  if (localStorage.getItem(PRELOAD_IN_PROGRESS) === '1') return;

  // Délai pour ne pas concurrencer le chargement initial de l'UI
  setTimeout(async () => {
    try {
      localStorage.setItem(PRELOAD_IN_PROGRESS, '1');
      const status = getStatus();
      let allOk = true;
      for (let s = 1; s <= 114; s++) {
        if (status[s]) continue;
        const ok = await downloadSurah(s);
        if (!ok) allOk = false;
        // petite pause pour rester courtois avec l'API
        await new Promise((r) => setTimeout(r, 150));
      }
      if (allOk) localStorage.setItem(PRELOAD_FLAG, 'done');
    } catch (e) {
      console.warn('[preloadTafsir] échec partiel:', e);
    } finally {
      localStorage.removeItem(PRELOAD_IN_PROGRESS);
    }
  }, 4000);
}

// ---------- Pré-traduction FR en arrière-plan ----------

type FrStatus = { [surah: number]: boolean };

const getFrStatus = (): FrStatus => {
  try { return JSON.parse(localStorage.getItem(FR_STATUS_KEY) || '{}'); }
  catch { return {}; }
};

const saveFrStatus = (s: FrStatus) => {
  try { localStorage.setItem(FR_STATUS_KEY, JSON.stringify(s)); } catch { /* quota */ }
};

const getArSurahMap = (surah: number): Record<number, string> | null => {
  try {
    const raw = localStorage.getItem(`${TAFSIR_CACHE_PREFIX}${surah}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const getFrSurahMap = (surah: number): Record<number, string> => {
  try { return JSON.parse(localStorage.getItem(`${FR_CACHE_PREFIX}${surah}`) || '{}'); }
  catch { return {}; }
};

const saveFrSurahMap = (surah: number, map: Record<number, string>) => {
  try { localStorage.setItem(`${FR_CACHE_PREFIX}${surah}`, JSON.stringify(map)); }
  catch { /* quota */ }
};

/**
 * Traduit en FR tous les versets d'Al-Muyassar en arrière-plan via l'edge function.
 * - Ne démarre que si l'AR est entièrement préchargé (sinon attend la prochaine session)
 * - Idempotent et reprise automatique
 * - S'arrête proprement sur 402/429 (reprend à la prochaine ouverture de l'app)
 */
export function preloadFrenchTafsirInBackground() {
  if (typeof window === 'undefined') return;
  if (!navigator.onLine) return;
  if (localStorage.getItem(FR_PRELOAD_FLAG) === 'done') return;
  if (localStorage.getItem(FR_PRELOAD_IN_PROGRESS) === '1') return;
  // On attend que l'AR soit téléchargé (sinon rien à traduire)
  if (localStorage.getItem(PRELOAD_FLAG) !== 'done') {
    // Réessaye dans 30s
    setTimeout(preloadFrenchTafsirInBackground, 30000);
    return;
  }

  // Import dynamique pour éviter de charger le client SB au boot
  setTimeout(async () => {
    try {
      localStorage.setItem(FR_PRELOAD_IN_PROGRESS, '1');
      const { supabase } = await import('@/integrations/supabase/client');
      const status = getFrStatus();
      let allOk = true;

      surahLoop:
      for (let s = 1; s <= 114; s++) {
        if (status[s]) continue;
        const ar = getArSurahMap(s);
        if (!ar) { allOk = false; continue; }
        const fr = getFrSurahMap(s);
        const verses = Object.keys(ar).map(Number).sort((a, b) => a - b);

        for (const v of verses) {
          if (fr[v]) continue;
          const text = ar[v];
          if (!text) continue;
          try {
            const { data, error } = await supabase.functions.invoke('translate-tafsir', {
              body: { text, targetLang: 'fr' },
            });
            // Erreurs réseau / fonction
            if (error) {
              const msg = (error as any)?.message || '';
              const ctx = (error as any)?.context;
              const statusCode = ctx?.status ?? ctx?.response?.status;
              if (statusCode === 402 || /402/.test(msg) || /crédit/i.test(msg)) {
                console.info('[preloadFrTafsir] crédits IA épuisés, pause');
                allOk = false;
                break surahLoop;
              }
              if (statusCode === 429 || /429/.test(msg)) {
                console.info('[preloadFrTafsir] rate limit, pause');
                allOk = false;
                break surahLoop;
              }
              allOk = false;
              continue;
            }
            const translation = (data as any)?.translation?.trim();
            if (translation) {
              fr[v] = translation;
              saveFrSurahMap(s, fr);
            }
          } catch (e) {
            console.warn('[preloadFrTafsir] erreur verset', s, v, e);
            allOk = false;
          }
          // throttle pour rester sous la limite de débit
          await new Promise((r) => setTimeout(r, 800));
        }

        // Marque la sourate comme entièrement traduite si tous les versets sont là
        const refreshed = getFrSurahMap(s);
        const complete = verses.every((v) => !!refreshed[v]);
        if (complete) {
          status[s] = true;
          saveFrStatus(status);
        } else {
          allOk = false;
        }
      }

      if (allOk) localStorage.setItem(FR_PRELOAD_FLAG, 'done');
    } catch (e) {
      console.warn('[preloadFrTafsir] échec partiel:', e);
    } finally {
      localStorage.removeItem(FR_PRELOAD_IN_PROGRESS);
    }
  }, 8000);
}