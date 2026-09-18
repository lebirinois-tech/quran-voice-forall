const toArabicDigits = (n: number) =>
  n.toString().replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);

export const TOTAL_MUSHAF_PAGES = 604;

/**
 * Affichage uniforme du numéro de page du Mushaf : « ٢ · Page 2 / 604 ».
 * Utilisé dans tous les modes d'affichage (pages Tajweed, texte par page…).
 */
export const MushafPageBadge = ({
  page,
  className,
}: {
  page: number;
  className?: string;
}) => (
  <span className={className}>
    <span dir="rtl" className="font-amiri">
      {toArabicDigits(page)}
    </span>
    {' · '}Page {page} / {TOTAL_MUSHAF_PAGES}
  </span>
);
