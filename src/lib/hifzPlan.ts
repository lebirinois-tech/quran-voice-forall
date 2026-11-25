import { supermemo, type SuperMemoItem, type SuperMemoGrade } from 'supermemo';

export interface HifzVerse { numberInSurah: number; text: string; page: number; juz: number; hizbQuarter: number }
export type HifzCorpus = Record<string, { arabic: HifzVerse[] }>;
export interface HifzRange { surah: number; from: number; to: number }
export type HifzUnit = 'surah' | 'pages' | 'juz' | 'quarter';
export interface HifzReview { date: string; grade: SuperMemoGrade; score?: number }
export interface HifzEntry {
  id: string; label: string; ranges: HifzRange[]; status: 'learning' | 'memorized';
  unit: HifzUnit; due: string; schedule: SuperMemoItem; history: HifzReview[];
  updatedAt: string; deleted?: boolean;
}
let corpusPromise: Promise<HifzCorpus> | null = null;
export const loadHifzCorpus = () => (corpusPromise ??= fetch('/data/quran-hafs-fr.json').then(r => {
  if (!r.ok) throw new Error('Le texte du Coran ne peut pas être chargé.');
  return r.json();
}).catch(e => { corpusPromise = null; throw e; }));

export function localDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return localDay(new Date(y, m - 1, d + days, 12));
}
export function resolveHifzRanges(corpus: HifzCorpus, unit: HifzUnit, start: number, end = start): HifzRange[] {
  const limits = { surah: 114, pages: 604, juz: 30, quarter: 240 };
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end > limits[unit]) return [];
  return Object.entries(corpus).sort(([a], [b]) => Number(a) - Number(b)).flatMap(([key, value]) => {
    const selected = value.arabic.filter(v => {
      const n = unit === 'surah' ? Number(key) : unit === 'pages' ? v.page : unit === 'juz' ? v.juz : v.hizbQuarter;
      return n >= start && n <= end;
    });
    return selected.length ? [{ surah: Number(key), from: selected[0].numberInSurah, to: selected[selected.length - 1].numberInSurah }] : [];
  });
}
export function createHifzEntry(label: string, ranges: HifzRange[], unit: HifzUnit, status: HifzEntry['status'], now = new Date()): HifzEntry {
  return { id: crypto.randomUUID(), label, ranges, unit, status, due: localDay(now),
    schedule: { interval: 0, repetition: 0, efactor: 2.5 }, history: [], updatedAt: now.toISOString() };
}
export function reviewHifzEntry(entry: HifzEntry, grade: SuperMemoGrade, score?: number, now = new Date()): HifzEntry {
  const schedule = supermemo(entry.schedule, grade);
  // A lapse is reviewed tomorrow; successful recall follows SM-2 (1, 6, then adaptive days).
  return { ...entry, schedule, status: grade >= 3 ? 'memorized' : 'learning',
    due: addDays(localDay(now), schedule.interval), updatedAt: now.toISOString(),
    history: [...entry.history, { date: now.toISOString(), grade, ...(score === undefined ? {} : { score }) }] };
}
export function scoreToGrade(score: number): SuperMemoGrade {
  return score >= 95 ? 5 : score >= 85 ? 4 : score >= 70 ? 3 : score >= 50 ? 2 : 1;
}
export const dueHifzEntries = (entries: HifzEntry[], day = localDay()) => entries
  .filter(e => !e.deleted && e.due <= day).sort((a, b) => a.due.localeCompare(b.due));
export function mergeHifzEntries(local: HifzEntry[], remote: HifzEntry[]): HifzEntry[] {
  const map = new Map<string, HifzEntry>();
  [...remote, ...local].forEach(e => {
    const previous = map.get(e.id);
    if (!previous || e.updatedAt >= previous.updatedAt) map.set(e.id, e);
  });
  return [...map.values()];
}