import { describe, expect, it } from 'vitest';
import { createHifzEntry, reviewHifzEntry, resolveHifzRanges, dueHifzEntries, mergeHifzEntries, type HifzCorpus } from './hifzPlan';

const now = new Date(2026, 10, 25, 8);
const entry = () => createHifzEntry('Al-Fatiha', [{ surah: 1, from: 1, to: 7 }], 'surah', 'memorized', now);
describe('Programme de mémorisation', () => {
  it('propose le passage ajouté à la révision du jour', () => {
    expect(dueHifzEntries([entry()], '2026-11-25')).toHaveLength(1);
    expect(dueHifzEntries([entry()], '2026-11-24')).toHaveLength(0);
  });
  it('espace les rappels réussis automatiquement', () => {
    const first = reviewHifzEntry(entry(), 5, 100, now);
    const second = reviewHifzEntry(first, 5, 98, new Date(2026, 10, 26, 8));
    expect(first.due).toBe('2026-11-26');
    expect(second.due).toBe('2026-12-02');
    expect(second.history.map(h => h.score)).toEqual([100, 98]);
  });
  it('ramène un passage oublié à demain', () => {
    const revised = reviewHifzEntry(entry(), 1, 40, now);
    expect(revised.due).toBe('2026-11-26');
    expect(revised.status).toBe('learning');
    expect(revised.schedule.repetition).toBe(0);
  });
  it('garde les suppressions les plus récentes lors de la synchronisation', () => {
    const original = entry();
    const removed = { ...original, deleted: true, updatedAt: new Date(2026, 10, 26).toISOString() };
    expect(mergeHifzEntries([removed], [original])).toEqual([removed]);
    expect(dueHifzEntries([removed], '2026-11-30')).toEqual([]);
  });
  it('sélectionne les vrais versets des pages même entre deux sourates', () => {
    const corpus = { '1': { arabic: [{ numberInSurah: 7, page: 1, juz: 1, hizbQuarter: 1, text: '' }] },
      '2': { arabic: [{ numberInSurah: 1, page: 2, juz: 1, hizbQuarter: 1, text: '' }, { numberInSurah: 2, page: 2, juz: 1, hizbQuarter: 1, text: '' }, { numberInSurah: 3, page: 3, juz: 1, hizbQuarter: 2, text: '' }] } } satisfies HifzCorpus;
    expect(resolveHifzRanges(corpus, 'pages', 1, 2)).toEqual([{ surah: 1, from: 7, to: 7 }, { surah: 2, from: 1, to: 2 }]);
    expect(resolveHifzRanges(corpus, 'quarter', 2)).toEqual([{ surah: 2, from: 3, to: 3 }]);
    expect(resolveHifzRanges(corpus, 'pages', 605)).toEqual([]);
  });
});