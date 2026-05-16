// Apply basic Tajweed coloring to plain Arabic Quran text (Warsh, Qalun, etc.)
// Uses the same color scheme as the Hafs Tajweed mode (FROZEN — do not modify).
//
// Rules applied (best-effort, suitable for any Riwaya):
//  - Madd  (red    #DD0000): maddah ٓ (U+0653) or superscript alef ٰ (U+0670)
//  - Ghunnah (green #2AAD2A): shaddah ّ on noon/meem
//  - Qalqalah (blue #2E6ECB): ق ط ب ج د carrying sukun ْ
//  - Iqlab (orange #D4740C): tanween (ً ٌ ٍ) followed by ب
//
// Output is HTML with <span style="color: #xxxxxx;"> wrappers, safe for the
// DOMPurify sanitizer used in the Tajweed pipeline.

const COLORS = {
  madd: '#DD0000',
  ghunnah: '#2AAD2A',
  qalqalah: '#2E6ECB',
  iqlab: '#D4740C',
} as const;

const QALQALAH_LETTERS = new Set(['ق', 'ط', 'ب', 'ج', 'د']);
const TANWEEN_MARKS = new Set(['\u064B', '\u064C', '\u064D']);
const SUKUN = '\u0652';
const SHADDAH = '\u0651';
const NOON = '\u0646';
const MEEM = '\u0645';
const BAA = 'ب';
const MADDAH = '\u0653';
const SUPERSCRIPT_ALEF = '\u0670';

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return c;
    }
  });

export const applyAutoTajweed = (text: string): string => {
  if (!text) return '';

  const chars = Array.from(text);
  const colors: Array<string | null> = chars.map(() => null);

  const paint = (idx: number, color: string) => {
    if (idx >= 0 && idx < chars.length) colors[idx] = color;
  };

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const prev = chars[i - 1];
    const next = chars[i + 1];

    // Madd: maddah above or superscript alef → color this mark + carrying letter
    if (ch === MADDAH || ch === SUPERSCRIPT_ALEF) {
      paint(i - 1, COLORS.madd);
      paint(i, COLORS.madd);
      continue;
    }

    // Ghunnah: shaddah on noon or meem
    if (ch === SHADDAH && (prev === NOON || prev === MEEM)) {
      paint(i - 1, COLORS.ghunnah);
      paint(i, COLORS.ghunnah);
      continue;
    }

    // Qalqalah: ق ط ب ج د followed by sukun
    if (QALQALAH_LETTERS.has(ch) && next === SUKUN) {
      paint(i, COLORS.qalqalah);
      paint(i + 1, COLORS.qalqalah);
      continue;
    }

    // Iqlab: tanween followed by baa (allow whitespace between)
    if (TANWEEN_MARKS.has(ch)) {
      let j = i + 1;
      while (j < chars.length && /\s/.test(chars[j])) j++;
      if (chars[j] === BAA) {
        paint(i - 1, COLORS.iqlab);
        paint(i, COLORS.iqlab);
        paint(j, COLORS.iqlab);
      }
    }
  }

  // Build HTML by grouping consecutive characters sharing the same color
  let html = '';
  let i = 0;
  while (i < chars.length) {
    const color = colors[i];
    if (!color) {
      html += escapeHtml(chars[i]);
      i++;
      continue;
    }
    let j = i;
    while (j < chars.length && colors[j] === color) j++;
    const segment = chars.slice(i, j).map(escapeHtml).join('');
    html += `<span style="color: ${color};">${segment}</span>`;
    i = j;
  }

  return html;
};