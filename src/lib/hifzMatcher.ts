import { normalizeArabic, searchTokens } from './quranSearch';

export type WordStatus = 'pending' | 'ok' | 'approx' | 'wrong' | 'missed';

const LOOKAHEAD = 4;

function distance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** Strip a leading "و"/"ف" and "ال" so speech-engine spacing variants still match. */
const core = (w: string) => w.replace(/^[وف](?=..)/, '').replace(/^ال(?=..)/, '');

export function compareWord(expected: string, heard: string): 'ok' | 'approx' | null {
  if (expected === heard || core(expected) === core(heard)) return 'ok';
  const a = core(expected), b = core(heard);
  const tolerance = a.length >= 6 ? 2 : a.length >= 3 ? 1 : 0;
  return tolerance > 0 && distance(a, b) <= tolerance ? 'approx' : null;
}

/** Aligns the spoken transcript to the expected words, from the start.
 * Handles speech-engine merges/splits; a heard word that replaces the expected one is "wrong". */
export function alignRecitation(expectedWords: string[], transcript: string, finished = false): WordStatus[] {
  const expected = expectedWords.map(normalizeArabic);
  const heard = searchTokens(transcript);
  const status: WordStatus[] = expected.map(() => 'pending');
  let pos = 0;
  let unmatched = 0;
  for (let h = 0; h < heard.length && pos < expected.length; h++) {
    const word = heard[h];
    let done = false;
    // Engine merged two Quran words into one, or split one into two.
    if (pos + 1 < expected.length && compareWord(expected[pos] + expected[pos + 1], word)) {
      status[pos] = status[pos + 1] = 'ok'; pos += 2; unmatched = 0; continue;
    }
    if (h + 1 < heard.length && !compareWord(expected[pos], word) && compareWord(expected[pos], word + heard[h + 1])) {
      status[pos] = 'ok'; pos += 1; h += 1; unmatched = 0; continue;
    }
    for (let k = 0; k < LOOKAHEAD && pos + k < expected.length; k++) {
      const match = compareWord(expected[pos + k], word);
      if (match) {
        for (let s = pos; s < pos + k; s++) status[s] = s - pos < unmatched ? 'wrong' : 'missed';
        status[pos + k] = match;
        pos += k + 1;
        unmatched = 0;
        done = true;
        break;
      }
    }
    if (!done) unmatched++;
  }
  if (finished) {
    for (let i = 0; i < status.length; i++) {
      if (status[i] === 'pending') { status[i] = unmatched > 0 ? 'wrong' : 'missed'; if (unmatched > 0) unmatched--; }
    }
  }
  return status;
}

/** Percentage over the words already evaluated (live) — speech-spelling variants count as correct. */
export function recitationScore(status: WordStatus[]): number {
  const done = status.filter((s) => s !== 'pending');
  if (!done.length) return 0;
  const points = done.filter((s) => s === 'ok' || s === 'approx').length;
  return Math.round((points / done.length) * 100);
}
