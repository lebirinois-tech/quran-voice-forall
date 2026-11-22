import { normalizeArabic, searchTokens } from './quranSearch';

export type WordStatus = 'pending' | 'ok' | 'approx' | 'missed';

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

/** Aligns the spoken transcript to the expected words, from the start. */
export function alignRecitation(expectedWords: string[], transcript: string, finished = false): WordStatus[] {
  const expected = expectedWords.map(normalizeArabic);
  const heard = searchTokens(transcript);
  const status: WordStatus[] = expected.map(() => 'pending');
  let pos = 0;
  for (const word of heard) {
    if (pos >= expected.length) break;
    for (let k = 0; k < LOOKAHEAD && pos + k < expected.length; k++) {
      const match = compareWord(expected[pos + k], word);
      if (match) {
        for (let s = pos; s < pos + k; s++) status[s] = 'missed';
        status[pos + k] = match;
        pos += k + 1;
        break;
      }
    }
  }
  if (finished) for (let i = 0; i < status.length; i++) if (status[i] === 'pending') status[i] = 'missed';
  return status;
}

export function recitationScore(status: WordStatus[]): number {
  if (!status.length) return 0;
  const points = status.reduce((n, s) => n + (s === 'ok' ? 1 : s === 'approx' ? 0.5 : 0), 0);
  return Math.round((points / status.length) * 100);
}
