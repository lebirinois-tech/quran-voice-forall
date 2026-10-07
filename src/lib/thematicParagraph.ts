import type { ThemeId } from '@/data/quranThemes';

export interface ThematicParagraph {
  surah: number;
  start: number;
  end: number;
  themeId: ThemeId;
}

/** A paragraph is a contiguous run, never every verse with the same category. */
export function getThematicParagraph(
  index: Record<string, ThemeId> | null,
  surah: number,
  verse: number,
): ThematicParagraph | undefined {
  const themeId = index?.[`${surah}:${verse}`];
  if (!index || !themeId) return undefined;
  let start = verse;
  let end = verse;
  while (start > 1 && index[`${surah}:${start - 1}`] === themeId) start--;
  while (index[`${surah}:${end + 1}`] === themeId) end++;
  return { surah, start, end, themeId };
}