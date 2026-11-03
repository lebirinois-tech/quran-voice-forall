/** Two alternating colours that switch at every Juz start (odd = emerald, even = gold). */
export function getJuzColors(juz: number) {
  const odd = juz % 2 === 1;
  return odd
    ? { band: 'hsl(158, 55%, 88%)', border: 'hsl(158, 45%, 72%)' }
    : { band: 'hsl(43, 85%, 85%)', border: 'hsl(40, 68%, 68%)' };
}
