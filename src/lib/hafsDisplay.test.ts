import { describe, it, expect } from 'vitest';
import { hafsDisplayText } from './hafsDisplay';
describe('hafsDisplayText', () => {
  it('لآية', () => expect(hafsDisplayText('لَـَٔايَةً')).toBe('لَأٓيَةً'));
  it('الآخرة', () => expect(hafsDisplayText('لِلْـَٔاخِرَةِ')).toBe('لِلْأٓخِرَةِ'));
  it('keeps بآيات', () => expect(hafsDisplayText('بِـَٔايَـٰتِنَا')).toBe('بِـَٔايَـٰتِنَا'));
  it('no black disc 525/236', () => { expect(hafsDisplayText('ٱلْمُصَۣيْطِرُونَ')).toBe('ٱلْمُصَيْطِرُونَ'); expect(hafsDisplayText('تَأْمَ۫نَّا')).toBe('تَأْمَنَّا'); });
  it('06DF', () => expect(hafsDisplayText('قَالُوا۟')).toBe('قَالُواْ'));
});

import { applyAutoTajweed } from './autoTajweed';
describe('lam-alef ligature', () => {
  it('كلا keeps lam+alef in one span', () => expect(applyAutoTajweed('\u0643\u064E\u0644\u0651\u064E\u0627\u0653')).toBe('<span style="color: #DD0000;">\u0643\u064E\u0644\u0651\u064E\u0627\u0653</span>'));
});
