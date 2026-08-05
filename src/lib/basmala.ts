// Utilitaires pour supprimer la Basmala répétée au début du premier verset.
// L'en-tête de sourate affiche déjà « بسم الله الرحمن الرحيم » ; les sources
// de texte (API Hafs, données Warsh/Qalun) la répètent dans le verset 1.

const DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/;

const normalizeChar = (ch: string): string => {
  if (DIACRITICS.test(ch)) return '';
  if (/\s/.test(ch)) return '';
  if (ch === '\u0671' || ch === '\u0623' || ch === '\u0625' || ch === '\u0622') return '\u0627';
  return ch;
};

// « بسم الله الرحمن الرحيم » sans espaces ni diacritiques
const TARGET = 'بسماللهالرحمنالرحيم';

/** Longueur (en caractères bruts) du préfixe Basmala, ou 0 si absent. */
const basmalaPrefixLength = (text: string): number => {
  let matched = 0;
  for (let i = 0; i < text.length; i++) {
    const n = normalizeChar(text[i]);
    if (!n) {
      if (matched === 0 && !/\s/.test(text[i]) && !DIACRITICS.test(text[i])) return 0;
      continue;
    }
    if (n !== TARGET[matched]) return 0;
    matched++;
    if (matched === TARGET.length) return i + 1;
  }
  return 0;
};

/** Supprime la Basmala en début de texte brut. */
export const stripLeadingBasmala = (text: string): string => {
  if (!text) return text;
  const len = basmalaPrefixLength(text);
  if (!len) return text;
  return text.slice(len).replace(/^[\s\u06DD]+/, '');
};

/** Supprime la Basmala en début de HTML (texte coloré Tajweed). */
export const stripLeadingBasmalaHtml = (html: string): string => {
  if (!html || typeof document === 'undefined') return html;
  const container = document.createElement('div');
  container.innerHTML = html;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let plain = '';
  let node = walker.nextNode() as Text | null;
  while (node) {
    nodes.push(node);
    plain += node.nodeValue ?? '';
    node = walker.nextNode() as Text | null;
  }
  const len = basmalaPrefixLength(plain);
  if (!len) return html;

  let remaining = len;
  for (const n of nodes) {
    const value = n.nodeValue ?? '';
    if (remaining >= value.length) {
      remaining -= value.length;
      n.nodeValue = '';
    } else {
      n.nodeValue = value.slice(remaining).replace(/^[\s\u06DD]+/, '');
      break;
    }
  }
  return container.innerHTML;
};

/** La sourate affiche-t-elle une Basmala d'en-tête ? (pas Al-Fatiha ni At-Tawba) */
export const surahHasHeaderBasmala = (surahNumber: number): boolean =>
  surahNumber !== 1 && surahNumber !== 9;
