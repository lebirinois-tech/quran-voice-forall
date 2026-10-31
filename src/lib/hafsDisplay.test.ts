import { describe, it, expect } from 'vitest';
import { hafsDisplayText } from './hafsDisplay';
describe('hafsDisplayText', () => {
  it('لآية', () => expect(hafsDisplayText('لَـَٔايَةً')).toBe('لَأٓيَةً'));
  it('الآخرة', () => expect(hafsDisplayText('لِلْـَٔاخِرَةِ')).toBe('لِلْأٓخِرَةِ'));
  it('keeps بآيات', () => expect(hafsDisplayText('بِـَٔايَـٰتِنَا')).toBe('بِـَٔايَـٰتِنَا'));
  it('06DF', () => expect(hafsDisplayText('قَالُوا۟')).toBe('قَالُواْ'));
});
