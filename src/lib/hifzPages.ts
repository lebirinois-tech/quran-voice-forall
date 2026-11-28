import type { WordStatus } from './hifzMatcher';

export function activeHifzGroup(groups: { key: string; items: { i: number }[] }[], status: WordStatus[]): string | undefined {
  return groups.find(g => g.items.some(({ i }) => status[i] === 'pending'))?.key ?? groups[groups.length - 1]?.key;
}

export function hifzPageLink(surah: number | string, page: number): string {
  return `/hifz?surah=${surah}&page=${page}`;
}