import { describe, it, expect } from 'vitest';
import { alignRecitation, recitationScore } from './hifzMatcher';

const fatiha = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ'.split(' ');

describe('hifzMatcher', () => {
  it('reveals words as they are spoken', () => {
    expect(alignRecitation(fatiha, 'بسم الله')).toEqual(['ok', 'ok', 'pending', 'pending']);
  });
  it('marks a skipped word as missed', () => {
    expect(alignRecitation(fatiha, 'بسم الرحمن الرحيم')).toEqual(['ok', 'missed', 'ok', 'ok']);
  });
  it('marks unspoken words as missed when finished and scores 50%', () => {
    const s = alignRecitation(fatiha, 'بسم الله', true);
    expect(s).toEqual(['ok', 'ok', 'missed', 'missed']);
    expect(recitationScore(s)).toBe(50);
  });
  it('marks a replaced word as wrong', () => {
    expect(alignRecitation(fatiha, 'بسم الله الكريم الرحيم', true)).toEqual(['ok', 'ok', 'wrong', 'ok']);
  });
  it('live score counts only words already recited', () => {
    expect(recitationScore(alignRecitation(fatiha, 'بسم الله'))).toBe(100);
  });
  it('gives 100% for a full correct recitation', () => {
    expect(recitationScore(alignRecitation(fatiha, 'بسم الله الرحمن الرحيم', true))).toBe(100);
  });
});
