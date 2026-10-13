import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { applyAutoTajweed } from './autoTajweed';

type Ayah = { numberInSurah: number; text: string };
type PackedWord = [number, number, string, string];
const corpus = JSON.parse(readFileSync('public/data/quran-hafs-fr.json', 'utf8')) as Record<string, { arabic: Ayah[] }>;
const pages = JSON.parse(readFileSync('public/data/hafs-medina-word-lines.json', 'utf8')) as Record<string, Record<string, PackedWord[]>>;

describe('Hafs Uthmani text integrity', () => {
  it('has 6236 verses and the same complete text in all 604 packed pages', () => {
    expect(Object.keys(pages)).toHaveLength(604);
    const words = new Map<string, string[]>();
    for (const page of Object.values(pages)) {
      for (const line of Object.values(page)) {
        for (const [surah, verse, kind, text] of line) {
          if (kind !== 'word') continue;
          const key = `${surah}:${verse}`;
          words.set(key, [...(words.get(key) ?? []), text]);
        }
      }
    }
    let count = 0;
    for (const [surah, data] of Object.entries(corpus)) {
      for (const ayah of data.arabic) {
        count++;
        expect(words.get(`${surah}:${ayah.numberInSurah}`)?.join(' ')).toBe(ayah.text);
        expect(ayah.text).not.toContain('\u06ED');
      }
    }
    expect(count).toBe(6236);
  });

  it('does not display false meem marks in the reported examples', () => {
    const imran = corpus['3'].arabic[190].text;
    expect(imran).toContain('قِيَـٰمًا وَقُعُودًا');
    expect(imran).not.toMatch(/[\u06E2\u06ED]/);
    expect(corpus['4'].arabic[3].text).toContain('عَن شَىْءٍ مِّنْهُ');
    expect(corpus['4'].arabic[3].text).not.toMatch(/[\u06E2\u06ED]/);
  });

  it('preserves authentic iqlab signs and every character when applying colours', () => {
    const text = corpus['2'].arabic[26].text;
    expect(text).toContain('مِنۢ بَعْدِ');
    expect(applyAutoTajweed(text).replace(/<[^>]*>/g, '')).toBe(text);
  });
});