import { describe, expect, it } from 'vitest';
import { getThematicParagraph } from './thematicParagraph';

describe('getThematicParagraph', () => {
  const index = { '2:1': 'knowledge', '2:2': 'knowledge', '2:3': 'prayer', '2:4': 'prayer', '2:5': 'prayer', '2:6': 'knowledge', '3:1': 'knowledge' } as const;
  it('returns the same full paragraph from any verse within it', () => {
    for (const verse of [3, 4, 5]) {
      expect(getThematicParagraph(index, 2, verse)).toEqual({ surah: 2, start: 3, end: 5, themeId: 'prayer' });
    }
  });
  it('does not join distant paragraphs or cross surahs', () => {
    expect(getThematicParagraph(index, 2, 2)?.end).toBe(2);
    expect(getThematicParagraph(index, 2, 6)).toEqual({ surah: 2, start: 6, end: 6, themeId: 'knowledge' });
  });
  it('waits for the index and rejects missing verses', () => {
    expect(getThematicParagraph(null, 2, 1)).toBeUndefined();
    expect(getThematicParagraph(index, 2, 99)).toBeUndefined();
  });
});