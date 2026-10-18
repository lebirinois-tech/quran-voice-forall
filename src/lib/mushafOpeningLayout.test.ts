import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { getMushafOpeningRows } from './mushafOpeningLayout';
import { surahHasHeaderBasmala } from './basmala';
import type { MedinaPageLines } from '@/hooks/useHafsMedinaWordLines';

const pages = JSON.parse(readFileSync('public/data/hafs-medina-word-lines.json', 'utf8')) as Record<string, Record<string, [number, number, 'word' | 'end', string][]>>;
const unpack = (page: string): MedinaPageLines => Object.fromEntries(
  Object.entries(pages[page]).map(([line, words]) => [line, words.map(([surah, verse, kind, text]) => ({ surah, verse, kind, text, wordIndex: 0 }))])
);

describe('Consistent Mushaf openings without lost official rows', () => {
  it('allocates separate title and Basmala for Yunus, just like Hud', () => {
    expect(getMushafOpeningRows(unpack('208')).slice(0, 3)).toEqual([
      { kind: 'title', surah: 10 }, { kind: 'basmala', surah: 10 }, { kind: 'content', line: 2 },
    ]);
    expect(getMushafOpeningRows(unpack('221')).filter(row => row.kind !== 'content')).toEqual([
      { kind: 'title', surah: 11 }, { kind: 'basmala', surah: 11 },
    ]);
  });
  it('preserves every nonempty official word row on all 604 pages', () => {
    expect(Object.keys(pages)).toHaveLength(604);
    for (const page of Object.keys(pages)) {
      const lines = unpack(page);
      const content = getMushafOpeningRows(lines).flatMap(row => row.kind === 'content' ? [row.line] : []);
      expect(content.filter(line => lines[line]?.length)).toEqual(
        Object.keys(lines).map(Number).sort((a, b) => a - b).filter(line => lines[line]?.length)
      );
    }
  });
  it('gives each detected opening one title and only the applicable Basmala', () => {
    const openings: number[] = [];
    for (const page of Object.keys(pages)) {
      const rows = getMushafOpeningRows(unpack(page));
      rows.forEach((row, index) => {
        if (row.kind !== 'title') return;
        openings.push(row.surah);
        if (surahHasHeaderBasmala(row.surah)) expect(rows[index + 1]).toEqual({ kind: 'basmala', surah: row.surah });
        else expect(rows[index + 1]?.kind).not.toBe('basmala');
      });
    }
    expect(openings).toContain(9);
    expect(openings).toContain(10);
  });
});