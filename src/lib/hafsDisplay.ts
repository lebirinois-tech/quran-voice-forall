/**
 * Corrections d'affichage du texte Hafs pour les polices KFGQPC :
 * - U+06DF (gros disque noir) → U+0652.
 * - Lam + ـٔ َ ا (ex. لَـَٔايَةً, ٱلْـَٔاخِرَةِ) → Lam + أٓ (لَأٓيَةً, ٱلْأٓخِرَةِ),
 *   graphie du Mushaf de Médine ; la hamza sur tatweel s'y affiche mal.
 */
export function hafsDisplayText(text: string): string {
  return text
    .replace(/\u06DF/g, '\u0652')
    .replace(/(\u0644[\u064B-\u0652\u06E1]*)\u0640(?:\u0654\u064E|\u064E\u0654)\u0627/g, '$1\u0623\u0653');
}
