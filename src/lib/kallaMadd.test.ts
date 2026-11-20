import { describe, it, expect } from 'vitest';
import { hafsDisplayText, KALLA_MADD_MARK } from './hafsDisplay';
import { applyAutoTajweed } from './autoTajweed';
import { sanitizeTajweedHtml } from './sanitize';

const render = (w: string) => sanitizeTajweedHtml(applyAutoTajweed(hafsDisplayText(w)));

describe('كلا / كلآ', () => {
  it('devant hamza (70:15) : mot relié + madda conservée', () => {
    expect(hafsDisplayText('\u0643\u064E\u0644\u0651\u064E\u0627\u0653 \u06D6')).toBe('\u0643\u064E\u0644\u0651\u064E\u0627' + KALLA_MADD_MARK + ' \u06D6');
    expect(render('\u0643\u064E\u0644\u0651\u064E\u0627\u0653 \u06D6')).toContain('class="kalla-madd"');
  });
  it('sans hamza (19:82) : pas de madda, alif non rouge', () => {
    expect(hafsDisplayText('كَلَّا ۚ')).toBe('كَلَّا ۚ');
    const html = render('كَلَّا ۚ');
    expect(html).not.toContain('kalla-madd');
    expect(html).not.toContain('<span style');
  });
  it('devant hamza : alif en rouge (madd)', () => {
    expect(render('\u0643\u064E\u0644\u0651\u064E\u0627\u0653')).toMatch(/<span style="color: #[0-9a-f]+;">ا<span class="kalla-madd"/i);
  });
});
