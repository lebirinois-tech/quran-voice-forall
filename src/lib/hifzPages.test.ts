// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveHifzRanges, type HifzCorpus } from './hifzPlan';
import { activeHifzGroup, hifzPageLink } from './hifzPages';
import { alignRecitation } from './hifzMatcher';

const corpus = JSON.parse(readFileSync('public/data/quran-hafs-fr.json', 'utf8')) as HifzCorpus;
describe('Pages du contrôle de mémorisation', () => {
  it('la page 2 contient uniquement Al-Baqarah 1 à 5, jamais 7 versets', () => {
    expect(resolveHifzRanges(corpus, 'pages', 2, 2)).toEqual([{ surah: 2, from: 1, to: 5 }]);
  });
  it('sélectionne toutes les pages 2 à 4 sans les versets de la page 5', () => {
    expect(resolveHifzRanges(corpus, 'pages', 2, 4)).toEqual([{ surah: 2, from: 1, to: 24 }]);
  });
  it('conserve toutes les sourates des pages choisies', () => {
    expect(resolveHifzRanges(corpus, 'pages', 1, 2)).toEqual([{ surah: 1, from: 1, to: 7 }, { surah: 2, from: 1, to: 5 }]);
  });
  it('ouvre la page affichée depuis le Mushaf', () => {
    expect(hifzPageLink(2, 2)).toBe('/hifz?surah=2&page=2');
  });
  it('avance à la page suivante seulement après le dernier mot de la précédente', () => {
    const expected = ['بسم', 'الله', 'الرحمن', 'الرحيم'];
    const groups = [{ key: '2', items: [{ i: 0 }, { i: 1 }] }, { key: '3', items: [{ i: 2 }, { i: 3 }] }];
    expect(activeHifzGroup(groups, alignRecitation(expected, 'بسم'))).toBe('2');
    expect(activeHifzGroup(groups, alignRecitation(expected, 'بسم الله'))).toBe('3');
    expect(activeHifzGroup(groups, alignRecitation(expected, 'بسم الله الرحمن الرحيم'))).toBe('3');
  });
});