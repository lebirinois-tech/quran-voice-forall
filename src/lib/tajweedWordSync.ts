/**
 * Découpe un HTML Tajweed (déjà assaini) en « mots » pour permettre le suivi
 * de la récitation audio, sans jamais altérer les couleurs des règles.
 *
 * Un mot peut être réparti sur plusieurs <span> colorés : tous les fragments
 * d'un même mot reçoivent le même index `data-w`, ce qui permet de surligner
 * le mot entier tout en conservant ses couleurs de Tajweed.
 *
 * Retourne aussi un poids par mot (nombre de lettres), utilisé pour estimer la
 * position de la récitation à partir de la progression de l'audio : les mots
 * longs durent plus longtemps que les mots courts.
 */
export interface TajweedWordSplit {
  html: string;
  weights: number[];
}

const ARABIC_LETTER = /[\u0621-\u064A\u0660-\u0669\u0671-\u06D3]/g;

const countLetters = (text: string) => (text.match(ARABIC_LETTER) || []).length;

export const splitHtmlIntoWords = (html: string): TajweedWordSplit => {
  if (typeof document === 'undefined' || !html) return { html, weights: [] };

  const root = document.createElement('div');
  root.innerHTML = html;

  let index = -1;
  let startNewWord = true;
  const weights: number[] = [];

  const walk = (node: Node) => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent ?? '';
        if (!text) continue;
        const frag = document.createDocumentFragment();
        for (const part of text.split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(part));
            startNewWord = true;
            continue;
          }
          if (startNewWord) {
            index += 1;
            weights[index] = 0;
            startNewWord = false;
          }
          weights[index] += Math.max(1, countLetters(part));
          const span = document.createElement('span');
          span.setAttribute('data-w', String(index));
          span.textContent = part;
          frag.appendChild(span);
        }
        child.parentNode?.replaceChild(frag, child);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    }
  };

  walk(root);

  return { html: root.innerHTML, weights: weights.map((w) => w || 1) };
};

/**
 * Index du mot en cours de récitation, estimé à partir de la progression de
 * l'audio du verset (0 à 100) pondérée par la longueur des mots.
 */
export const wordIndexForProgress = (weights: number[], progressPct: number): number => {
  if (!weights.length) return -1;
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return -1;
  const p = Math.min(1, Math.max(0, progressPct / 100));
  const target = p * total;
  let acc = 0;
  for (let i = 0; i < weights.length; i += 1) {
    acc += weights[i];
    if (target <= acc) return i;
  }
  return weights.length - 1;
};
