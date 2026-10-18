import type { MedinaPageLines } from '@/hooks/useHafsMedinaWordLines';
import { surahHasHeaderBasmala } from './basmala';

export type MushafRow =
  | { kind: 'content'; line: number }
  | { kind: 'title' | 'basmala'; surah: number };

/** Keep every official word row intact; expand a one-slot opening, never displace words. */
export const getMushafOpeningRows = (lines: MedinaPageLines): MushafRow[] => {
  const rows: MushafRow[] = [];
  for (let line = 1; line <= 15; line += 1) {
    if ((lines[line] ?? []).length > 0) {
      rows.push({ kind: 'content', line });
      continue;
    }
    let next = line + 1;
    while (next <= 15 && (lines[next] ?? []).length === 0) next += 1;
    const first = lines[next]?.[0];
    if (first?.verse === 1) {
      rows.push({ kind: 'title', surah: first.surah });
      if (surahHasHeaderBasmala(first.surah)) rows.push({ kind: 'basmala', surah: first.surah });
      line = next - 1;
    } else {
      rows.push({ kind: 'content', line });
    }
  }
  return rows;
};