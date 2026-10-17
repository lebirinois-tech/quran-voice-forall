export const TOTAL_MUSHAF_PAGES = 604;

/**
 * Affichage uniforme et compact du numéro de page du Mushaf : « 55 / 604 ».
 */
export const MushafPageBadge = ({
  page,
  className,
}: {
  page: number;
  className?: string;
}) => (
  <span className={className} dir="ltr">
    {page} / {TOTAL_MUSHAF_PAGES}
  </span>
);
