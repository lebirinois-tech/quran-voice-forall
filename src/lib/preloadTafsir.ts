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