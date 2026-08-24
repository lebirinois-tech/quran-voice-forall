/**
 * Téléchargement automatique des trois riwayat (Hafs, Warsh, Qalun) dès la
 * première ouverture / installation de l'application.
 *
 * Tout provient de fichiers embarqués dans l'APK / la PWA (`/data/*.json`),
 * il n'y a donc aucune dépendance à un service externe. Les données sont
 * écrites dans IndexedDB pour un usage 100 % hors connexion.
 */

import { sanitizeTajweedHtml } from '@/lib/sanitize';
import { putSurahText, getCachedSurahNumbers } from '@/lib/offlineTextStore';
import { getDataset, putDataset } from '@/lib/offlineDatasetStore';

export const WARSH_DATASET_KEY = 'warsh-data-v10';
export const QALUN_DATASET_KEY = 'qalun-data-v10';

const BOOTSTRAP_KEY = 'quran-auto-offline-riwayat';
const BOOTSTRAP_VERSION = '2026-08-24-riwayat-v1';
const TEXT_CACHE_STATUS = 'quran-text-cache-status';

export interface AutoOfflineProgress {
  step: 'hafs' | 'warsh' | 'qalun' | 'done';
  percent: number;
}

export const AUTO_OFFLINE_EVENT = 'quran-auto-offline-progress';

const emit = (detail: AutoOfflineProgress) => {
  window.dispatchEvent(new CustomEvent<AutoOfflineProgress>(AUTO_OFFLINE_EVENT, { detail }));
};

const TAJWEED_COLORS: Record<string, string> = {
  h: '#AAAAAA', s: '#AAAAAA', l: '#AAAAAA', u: '#AAAAAA', d: '#AAAAAA', b: '#AAAAAA',
  g: '#2AAD2A',
  f: '#DD0000', c: '#DD0000', n: '#DD0000',
  p: '#CC0000', m: '#BB0000', o: '#AA0000',
  a: '#B266D9', w: '#B266D9',
  q: '#2E6ECB',
  i: '#D4740C',
};

const parseTajweedText = (text: string): string => {
  let result = text;
  Object.entries(TAJWEED_COLORS).forEach(([marker, color]) => {
    const regex = new RegExp(`\\[${marker}(?::\\d+)?\\[([^\\]]+)\\]`, 'g');
    result = result.replace(regex, `<span style="color: ${color};">$1</span>`);
  });
  return result;
};

interface BundledAyah { text: string; numberInSurah: number; page: number }
interface BundledSurah { arabic: BundledAyah[]; tajweed: BundledAyah[]; translation: BundledAyah[] }

const markSurahCached = (surahNumber: number) => {
  try {
    const status = JSON.parse(localStorage.getItem(TEXT_CACHE_STATUS) || '{}');
    status[surahNumber] = true;
    localStorage.setItem(TEXT_CACHE_STATUS, JSON.stringify(status));
  } catch {
    /* quota : sans importance, IndexedDB fait foi */
  }
};

/** Hafs : texte + traduction + Tajweed des 114 sourates. */
const cacheHafsText = async () => {
  const already = new Set(await getCachedSurahNumbers());
  if (already.size >= 114) {
    emit({ step: 'hafs', percent: 100 });
    return;
  }

  const response = await fetch('/data/quran-hafs-fr.json');
  if (!response.ok) throw new Error(`Texte Hafs indisponible (${response.status})`);
  const all = (await response.json()) as Record<string, BundledSurah>;

  for (let s = 1; s <= 114; s++) {
    if (!already.has(s)) {
      const bundled = all[String(s)];
      if (bundled) {
        const verses = bundled.arabic.map((ayah, index) => ({
          number: ayah.numberInSurah,
          text: ayah.text,
          translation: bundled.translation[index]?.text || '',
          page: ayah.page,
        }));
        const tajweed: Record<number, string> = {};
        bundled.tajweed.forEach((ayah) => {
          tajweed[ayah.numberInSurah] = sanitizeTajweedHtml(parseTajweedText(ayah.text));
        });
        if (await putSurahText(s, { verses, tajweed, timestamp: Date.now() })) markSurahCached(s);
      }
    }
    emit({ step: 'hafs', percent: Math.round((s / 114) * 100) });
  }
};

const cacheRiwayaDataset = async (
  step: 'warsh' | 'qalun',
  key: string,
  url: string
) => {
  if (await getDataset(key)) {
    emit({ step, percent: 100 });
    return;
  }
  emit({ step, percent: 10 });
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Données ${step} indisponibles (${response.status})`);
  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) throw new Error(`Données ${step} invalides`);
  emit({ step, percent: 60 });
  const stored = await putDataset(key, data);
  if (!stored) throw new Error(`Stockage hors ligne indisponible (${step})`);
  emit({ step, percent: 100 });
};

export const isAutoOfflineDone = () =>
  localStorage.getItem(BOOTSTRAP_KEY) === BOOTSTRAP_VERSION;

/**
 * Lance (une seule fois par version) le téléchargement des trois riwayat.
 * Silencieux et non bloquant : toute erreur laisse le drapeau non posé pour
 * une nouvelle tentative au prochain lancement.
 */
export const bootstrapOfflineRiwayat = async () => {
  if (isAutoOfflineDone()) return;
  try {
    await navigator.storage?.persist?.();
    await cacheHafsText();
    await cacheRiwayaDataset('warsh', WARSH_DATASET_KEY, '/data/warsh-data.json');
    await cacheRiwayaDataset('qalun', QALUN_DATASET_KEY, '/data/qalun-data.json');
    localStorage.setItem(BOOTSTRAP_KEY, BOOTSTRAP_VERSION);
    emit({ step: 'done', percent: 100 });
  } catch (error) {
    console.warn('Téléchargement automatique des riwayat reporté:', error);
  }
};

/** Planifie le téléchargement en arrière-plan, sans ralentir le démarrage. */
export const scheduleOfflineRiwayatBootstrap = () => {
  if (typeof window === 'undefined' || isAutoOfflineDone()) return;
  const start = () => void bootstrapOfflineRiwayat();
  if ('requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void, o?: { timeout: number }) => void })
      .requestIdleCallback(start, { timeout: 8000 });
  } else {
    setTimeout(start, 3000);
  }
};
