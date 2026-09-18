import { useEffect, useState } from 'react';
import { sanitizeTajweedHtml } from '@/lib/sanitize';
import { applyAutoTajweed } from '@/lib/autoTajweed';
import { stripLeadingBasmala, stripLeadingBasmalaHtml, surahHasHeaderBasmala } from '@/lib/basmala';
import { parseTajweedText } from '@/hooks/useQuranData';
import { getDataset } from '@/lib/offlineDatasetStore';
import { WARSH_DATASET_KEY, QALUN_DATASET_KEY } from '@/lib/autoOfflineRiwayat';

/**
 * Contenu COMPLET d'une page de Mushaf : toutes les sourates présentes sur la
 * page (fin de la sourate précédente, début de la suivante), comme dans un
 * Mushaf imprimé. Les trois lectures (Hafs, Warsh, Qalun) sont supportées à
 * partir des données embarquées / mises en cache hors ligne.
 */

export interface FullPageVerse {
  number: number;
  html: string;
}

export interface FullPageGroup {
  surahNumber: number;
  /** La sourate commence sur cette page (afficher l'en-tête + Basmala). */
  startsHere: boolean;
  verses: FullPageVerse[];
}

// ——— Hafs : Coran embarqué (/data/quran-hafs-fr.json) ———

interface BundledAyah {
  numberInSurah: number;
  page: number;
  text: string;
}
interface BundledSurah {
  arabic: BundledAyah[];
  tajweed: BundledAyah[];
}

const pushVerse = (
  map: Map<number, FullPageGroup[]>,
  page: number,
  surahNumber: number,
  verse: FullPageVerse
) => {
  let groups = map.get(page);
  if (!groups) {
    groups = [];
    map.set(page, groups);
  }
  let last = groups[groups.length - 1];
  if (!last || last.surahNumber !== surahNumber) {
    last = { surahNumber, startsHere: verse.number === 1, verses: [] };
    groups.push(last);
  }
  last.verses.push(verse);
};

let hafsIndexPromise: Promise<Map<number, FullPageGroup[]>> | null = null;

const loadHafsIndex = (): Promise<Map<number, FullPageGroup[]>> => {
  hafsIndexPromise ??= fetch('/data/quran-hafs-fr.json')
    .then((r) => {
      if (!r.ok) throw new Error(`Bundled Quran HTTP ${r.status}`);
      return r.json() as Promise<Record<string, BundledSurah>>;
    })
    .then((data) => {
      const map = new Map<number, FullPageGroup[]>();
      const keys = Object.keys(data).sort((a, b) => Number(a) - Number(b));
      for (const key of keys) {
        const surahNumber = Number(key);
        const surah = data[key];
        surah.arabic.forEach((ayah, i) => {
          const page = ayah.page;
          if (!page) return;
          // Même coloration Tajweed que le mode verset (palette simplifiée,
          // identique Hafs / Warsh / Qalun) plutôt que l'ancien schéma API
          // aux multiples teintes de rouge.
          let text = ayah.text;
          if (ayah.numberInSurah === 1 && surahHasHeaderBasmala(surahNumber)) {
            text = stripLeadingBasmala(text);
          }
          const html = sanitizeTajweedHtml(applyAutoTajweed(text));
          pushVerse(map, page, surahNumber, { number: ayah.numberInSurah, html });
        });
      }
      return map;
    });
  return hafsIndexPromise;
};

// ——— Warsh / Qalun : jeux de données KFGQPC (IndexedDB ou embarqué) ———

interface RiwayaVerse {
  page: string;
  sura_no: number;
  aya_no: number;
  aya_text: string;
}

const isRiwayaData = (data: unknown): data is RiwayaVerse[] =>
  Array.isArray(data) &&
  data.length > 0 &&
  typeof data[0] === 'object' &&
  data[0] !== null &&
  'sura_no' in data[0] &&
  'aya_text' in data[0];

const riwayaIndexPromises: Partial<
  Record<'warsh' | 'qalun', Promise<Map<number, FullPageGroup[]>>>
> = {};

const loadRiwayaIndex = (
  riwaya: 'warsh' | 'qalun'
): Promise<Map<number, FullPageGroup[]>> => {
  const existing = riwayaIndexPromises[riwaya];
  if (existing) return existing;

  const datasetKey = riwaya === 'warsh' ? WARSH_DATASET_KEY : QALUN_DATASET_KEY;
  const url = riwaya === 'warsh' ? '/data/warsh-data.json' : '/data/qalun-data.json';

  const promise = (async () => {
    let data = await getDataset<RiwayaVerse[]>(datasetKey);
    if (!isRiwayaData(data)) {
      const response = await fetch(url, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`Riwaya data HTTP ${response.status}`);
      const parsed = await response.json();
      if (!isRiwayaData(parsed)) throw new Error('Invalid riwaya data');
      data = parsed;
    }

    const map = new Map<number, FullPageGroup[]>();
    for (const v of data) {
      // Une âyah à cheval sur deux pages ("85-86") est rattachée à la page où
      // elle commence, comme dans le Mushaf imprimé.
      const page = parseInt(String(v.page).split('-')[0], 10);
      if (!Number.isFinite(page)) continue;
      let text = v.aya_text;
      if (v.aya_no === 1 && surahHasHeaderBasmala(v.sura_no)) {
        text = stripLeadingBasmala(text);
      }
      const html = sanitizeTajweedHtml(applyAutoTajweed(text));
      pushVerse(map, page, v.sura_no, { number: v.aya_no, html });
    }
    return map;
  })();

  riwayaIndexPromises[riwaya] = promise;
  return promise;
};

/**
 * Retourne les groupes de versets (par sourate) de la page demandée, ou null
 * tant que l'index n'est pas prêt / si le style n'est pas un mode « pages ».
 */
export const useFullMushafPage = (page: number | null, style: string) => {
  const [groups, setGroups] = useState<FullPageGroup[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const isPagesMode =
      style === 'pages-hafs' || style === 'pages-warsh' || style === 'pages-qalun';
    if (page == null || !isPagesMode) {
      setGroups(null);
      return;
    }
    const load =
      style === 'pages-hafs'
        ? loadHafsIndex
        : () => loadRiwayaIndex(style === 'pages-warsh' ? 'warsh' : 'qalun');
    load()
      .then((map) => {
        if (!cancelled) setGroups(map.get(page) ?? []);
      })
      .catch(() => {
        if (!cancelled) setGroups(null);
      });
    return () => {
      cancelled = true;
    };
  }, [page, style]);

  return { groups };
};
