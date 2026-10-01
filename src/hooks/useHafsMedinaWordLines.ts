import { useEffect, useState } from 'react';

export type MedinaWordKind = 'word' | 'end';

export interface MedinaLineWord {
  surah: number;
  verse: number;
  kind: MedinaWordKind;
  text: string;
  wordIndex: number;
}

export type MedinaPageLines = Record<number, MedinaLineWord[]>;

type PackedWord = [number, number, MedinaWordKind, string];
type PackedPages = Record<string, Record<string, PackedWord[]>>;

let pagesPromise: Promise<PackedPages> | null = null;

const loadPages = () => {
  pagesPromise ??= fetch('/data/hafs-medina-word-lines.json', { cache: 'force-cache' }).then((response) => {
    if (!response.ok) throw new Error(`Medina lines HTTP ${response.status}`);
    return response.json() as Promise<PackedPages>;
  });
  return pagesPromise;
};

/** Coupures mot par mot de l'édition Médine Hafs, conservées hors ligne. */
export const useHafsMedinaWordLines = (page: number, enabled: boolean) => {
  const [lines, setLines] = useState<MedinaPageLines | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!enabled) {
      setLines(null);
      return;
    }

    loadPages()
      .then((pages) => {
        if (cancelled) return;
        const packed = pages[String(page)];
        if (!packed) {
          setLines(null);
          return;
        }
        const counters = new Map<string, number>();
        const unpacked: MedinaPageLines = {};
        for (let line = 1; line <= 15; line += 1) {
          unpacked[line] = (packed[String(line)] ?? []).map(([surah, verse, kind, text]) => {
            const key = `${surah}:${verse}`;
            const nextIndex = kind === 'word' ? (counters.get(key) ?? 0) : -1;
            if (kind === 'word') counters.set(key, nextIndex + 1);
            return { surah, verse, kind, text, wordIndex: nextIndex };
          });
        }
        // L'API attribue parfois le médaillon de fin au numéro de la ligne
        // suivante. Dans le Mushaf imprimé il reste après le dernier mot du
        // verset : le replacer sur cette ligne reproduit la page à l'identique.
        for (let line = 2; line <= 15; line += 1) {
          const endings = unpacked[line].filter((word) => word.kind === 'end');
          for (const ending of endings) {
            if (unpacked[line].some((word) =>
              word.kind === 'word' && word.surah === ending.surah && word.verse === ending.verse
            )) continue;
            for (let previous = line - 1; previous >= 1; previous -= 1) {
              if (unpacked[previous].some((word) =>
                word.kind === 'word' && word.surah === ending.surah && word.verse === ending.verse
              )) {
                unpacked[line] = unpacked[line].filter((word) => word !== ending);
                unpacked[previous].push(ending);
                break;
              }
            }
          }
        }
        setLines(unpacked);
      })
      .catch(() => {
        if (!cancelled) setLines(null);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, page]);

  return lines;
};