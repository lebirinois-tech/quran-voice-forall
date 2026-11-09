/** Two alternating colours that switch at every Juz start (odd = emerald, even = sky blue). */
export function getJuzColors(juz: number) {
  const odd = juz % 2 === 1;
  return odd
    ? { band: 'hsl(158, 55%, 88%)', border: 'hsl(158, 45%, 72%)' }
    : { band: 'hsl(200, 90%, 88%)', border: 'hsl(203, 70%, 62%)' };
}
