import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { AspectRatio } from './ui/aspect-ratio';
import { cn } from '@/lib/utils';
import { getVersePage, surahs } from '@/data/surahs';

type MushafType = 'hafs' | 'warsh' | 'qalun' | 'hafs-video' | 'warsh-video' | 'qalun-video';

const VIDEO_SOURCES: Record<'hafs-video' | 'warsh-video' | 'qalun-video', { id: string; label: string }> = {
  'hafs-video': { id: '508_202gggggggg', label: '🎬 Mushaf Hafs vidéo' },
  'warsh-video': { id: '228_2025ssssssss', label: '🎬 Mushaf Warsh vidéo' },
  'qalun-video': { id: 'x241120cccccccccc', label: '🎬 Mushaf Qalun vidéo' },
};

interface MushafPageViewerProps {
  surahNumber: number;
  totalVerses: number;
  mushafType: MushafType;
  initialPage?: number;
  onPageChange?: (page: number) => void;
  currentVerse?: number;
  isAudioPlaying?: boolean;
  pageVerseRange?: { first: number; last: number } | null;
  pageVerseNumbers?: number[];
  onVerseClick?: (verseNumber: number) => void;
}

const padPage3 = (n: number) => n.toString().padStart(3, '0');

// Archive.org scanned Mushafs (own pagination, NOT the standard 604 pages)
const ARCHIVE_SOURCES = {
  warsh: {
    id: 'Warsh_Azraq',
    totalPages: 609,
    // Nombre de pages de couverture/intro avant la Fatiha dans le scan
    fatihaOffset: 4,
    label: '📜 Warsh (Azraq) — Tajweed coloré, archive.org',
  },
  qalun: {
    id: 'moshaf-tajwed-qaloun',
    totalPages: 601,
    fatihaOffset: 6,
    label: '📗 Qalun — Tajweed coloré (Dar Al-Ma\'rifa), archive.org',
  },
} as const;

const CACHE_BUST = 'mushaf-scan-only-20260711-v4';

const withCacheBust = (url: string) => `${url}${url.includes('?') ? '&' : '?'}v=${CACHE_BUST}`;

const getArchivePageUrl = (id: string, page: number) =>
  withCacheBust(`https://archive.org/download/${id}/page/n${page - 1}_w1200.jpg`);

const getPageUrls = (page: number, mushafType: MushafType): string[] => {
  const padded = padPage3(page);
  switch (mushafType) {
    case 'hafs':
      // Hafs Tajweed coloré — uniquement en image scan HD.
      // Ne jamais repasser par un rendu texte/police : les polices QPC encodées
      // peuvent afficher des lettres incohérentes si elles reçoivent du Unicode.
      return [
        withCacheBust(`https://cdn.jsdelivr.net/gh/jahedev/tajweed-quran-pages@master/hafs/tajweed-${padded}.jpg`),
        withCacheBust(`https://raw.githubusercontent.com/jahedev/tajweed-quran-pages/master/hafs/tajweed-${padded}.jpg`),
        withCacheBust(`https://cdn.jsdelivr.net/gh/QuranHub/quran-pages-images@main/easyquran.com/hafs-tajweed/${page}.jpg`),
        withCacheBust(`https://raw.githubusercontent.com/QuranHub/quran-pages-images/main/easyquran.com/hafs-tajweed/${page}.jpg`),
      ];
    case 'qalun':
      // Mushaf Qalun Tajweed coloré — scans directs archive.org (moshaf-tajwed-qaloun)
      return [getArchivePageUrl(ARCHIVE_SOURCES.qalun.id, page)];
    case 'warsh':
    default:
      // Mushaf Warsh Tajweed coloré (Azraq) — scans directs archive.org
      return [getArchivePageUrl(ARCHIVE_SOURCES.warsh.id, page)];
  }
};

// Get surah start and end pages
const getSurahPages = (surahNumber: number): { start: number; end: number } => {
  const surah = surahs.find(s => s.number === surahNumber);
  if (!surah) return { start: 1, end: 604 };
  const startPage = getVersePage(surahNumber, 1, surah.versesCount);
  const endPage = getVersePage(surahNumber, surah.versesCount, surah.versesCount);
  return { start: startPage, end: endPage };
};

export const MushafPageViewer = ({
  surahNumber,
  totalVerses,
  mushafType,
  initialPage,
  onPageChange,
  currentVerse,
  isAudioPlaying,
  pageVerseRange,
  pageVerseNumbers,
  onVerseClick,
}: MushafPageViewerProps) => {
  const surah = surahs.find(s => s.number === surahNumber);
  // Archive-mode Mushafs (Warsh/Qalun) use their own scanned pagination (1..N),
  // independent of the 604-page Madina standard. Hafs keeps the standard mapping.
  const isArchiveMode = mushafType === 'warsh' || mushafType === 'qalun';
  const archive = isArchiveMode ? ARCHIVE_SOURCES[mushafType] : null;
  const isVideoMode = mushafType === 'hafs-video' || mushafType === 'warsh-video' || mushafType === 'qalun-video';
  const videoSource = isVideoMode ? VIDEO_SOURCES[mushafType as keyof typeof VIDEO_SOURCES] : null;
  const [loopPage, setLoopPage] = useState(false);

  const { start: surahStartPage, end: surahEndPage } = useMemo(
    () => (isArchiveMode
      ? { start: 1, end: archive!.totalPages - archive!.fatihaOffset }
      : getSurahPages(surahNumber)),
    [surahNumber, isArchiveMode, archive]
  );
  const maxPage = isArchiveMode ? archive!.totalPages - archive!.fatihaOffset : 604;

  const [currentPage, setCurrentPage] = useState(
    initialPage && initialPage >= surahStartPage && initialPage <= surahEndPage
      ? initialPage
      : surahStartPage
  );
  const [isLoading, setIsLoading] = useState(true);

  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState('');
  const [imageSourceIndex, setImageSourceIndex] = useState(0);
  // Use a ref to track manual navigation - survives re-renders without triggering effects
  const hasManuallyNavigatedRef = useRef(
    !!(initialPage && initialPage >= surahStartPage && initialPage <= surahEndPage)
  );
  const prevSurahNumberRef = useRef(surahNumber);
  const currentVerseBtnRef = useRef<HTMLButtonElement | null>(null);

  // Swipe handling
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  // Only reset page when the surah actually changes
  useEffect(() => {
    if (prevSurahNumberRef.current !== surahNumber) {
      // Surah changed - reset to initialPage or start page
      prevSurahNumberRef.current = surahNumber;
      hasManuallyNavigatedRef.current = false;
      if (initialPage && initialPage >= surahStartPage && initialPage <= surahEndPage) {
        setCurrentPage(initialPage);
        hasManuallyNavigatedRef.current = true;
      } else {
        setCurrentPage(surahStartPage);
      }
    } else if (initialPage && initialPage >= surahStartPage && initialPage <= surahEndPage && !hasManuallyNavigatedRef.current) {
      // Same surah but initialPage provided and no manual navigation yet
      setCurrentPage(initialPage);
      hasManuallyNavigatedRef.current = true;
    }
    // If user has manually navigated, never reset the page
  }, [surahNumber, surahStartPage, surahEndPage, initialPage]);

  // Report current page to parent whenever it changes
  useEffect(() => {
    onPageChange?.(currentPage);
  }, [currentPage, onPageChange]);

  useEffect(() => {
    setIsLoading(true);
    setImageError(false);
    setImageSourceIndex(0);
    const effectivePage = isArchiveMode ? currentPage + (archive?.fatihaOffset ?? 0) : currentPage;
    setImageSrc(getPageUrls(effectivePage, mushafType)[0] ?? '');
  }, [currentPage, mushafType]);

  const goToPage = useCallback((newPage: number) => {
    if (newPage < 1 || newPage > maxPage || newPage === currentPage) return;
    hasManuallyNavigatedRef.current = true;
    setCurrentPage(newPage);
    onPageChange?.(newPage);
  }, [currentPage, onPageChange, maxPage]);

  // Auto-scroll the current verse button into view inside the strip
  useEffect(() => {
    if (currentVerseBtnRef.current) {
      const btn = currentVerseBtnRef.current;
      const strip = btn.closest('[data-verse-strip]') as HTMLElement | null;
      if (strip) {
        // Scroll only horizontally inside the strip, without affecting the page
        const target =
          btn.offsetLeft - strip.clientWidth / 2 + btn.clientWidth / 2;
        strip.scrollTo({ left: target, behavior: 'smooth' });
      }
    }
  }, [currentVerse, isAudioPlaying]);

  // Note: in RTL Arabic reading, swiping LEFT advances to the next page,
  // swiping RIGHT goes back to the previous page (book opens right-to-left).
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartXRef.current = t.clientX;
    touchStartYRef.current = t.clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const startX = touchStartXRef.current;
    const startY = touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    if (startX == null || startY == null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) goToPage(currentPage + 1); // swipe left → next page
    else goToPage(currentPage - 1);        // swipe right → previous page
  };

  const handleImageLoad = () => { setIsLoading(false); setImageError(false); };
  const handleImageError = () => {
    const effectivePage = isArchiveMode ? currentPage + (archive?.fatihaOffset ?? 0) : currentPage;
    const sources = getPageUrls(effectivePage, mushafType);
    const nextIndex = imageSourceIndex + 1;

    if (nextIndex < sources.length) {
      setImageSourceIndex(nextIndex);
      setImageSrc(sources[nextIndex]);
      setIsLoading(true);
      return;
    }

    setIsLoading(false);
    setImageError(true);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Page Info Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="text-sm text-muted-foreground">
          {mushafType === 'hafs' && '📖 Mushaf Hafs Tajweed'}
          {mushafType === 'warsh' && '📜 Mushaf Warsh Tajweed (Azraq)'}
          {mushafType === 'qalun' && '📗 Mushaf Qalun Tajweed'}
          {mushafType === 'hafs-video' && '🎬 Mushaf Hafs vidéo'}
          {mushafType === 'warsh-video' && '🎬 Mushaf Warsh vidéo'}
          {mushafType === 'qalun-video' && '🎬 Mushaf Qalun vidéo'}
        </div>
        <span className="text-sm font-medium text-foreground">
          Page {currentPage} / {maxPage}
        </span>
      </div>

      {/* Currently playing verse indicator — only meaningful for standard 604-page mapping (Hafs) */}
      {!isArchiveMode && pageVerseRange && currentVerse && currentVerse >= pageVerseRange.first && currentVerse <= pageVerseRange.last && (
        <div className={cn(
          "mb-3 flex items-center justify-center gap-2 px-4 py-2 rounded-full border-2 transition-all",
          isAudioPlaying
            ? "bg-primary/15 border-primary text-primary animate-pulse"
            : "bg-muted/50 border-border text-foreground"
        )}>
          <span className="text-sm font-semibold">
            🔊 Verset en cours : <span className="font-bold">{currentVerse}</span>
            <span className="text-xs opacity-70 ml-2">
              (page {pageVerseRange.first}–{pageVerseRange.last})
            </span>
          </span>
        </div>
      )}

      {/* Page viewer (swipe left/right to change page) */}
      <div
        className="relative touch-pan-y select-none"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {isArchiveMode && (
          <div className="mb-3 flex items-center justify-center gap-2">
            {/* En lecture RTL : le bouton de GAUCHE avance vers la page suivante */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= maxPage}
              aria-label="Page suivante"
            >
              ◀️ Page suivante
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              aria-label="Page précédente"
            >
              Page préc. ▶️
            </Button>
          </div>
        )}
        {isVideoMode ? (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={loopPage ? 'default' : 'outline'}
                onClick={() => setLoopPage(v => !v)}
              >
                🔁 Répéter la page {loopPage ? '(activé)' : ''}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                ◀️ Page préc.
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= maxPage}
              >
                Page suiv. ▶️
              </Button>
            </div>
            <AspectRatio ratio={3 / 4} className="rounded-xl overflow-hidden border border-border shadow-lg bg-black">
              <video
                key={`${mushafType}-${currentPage}`}
                src={`https://archive.org/download/${videoSource!.id}/${padPage3(currentPage)}.mp4`}
                controls
                playsInline
                preload="metadata"
                loop={loopPage}
                onEnded={() => {
                  if (!loopPage && currentPage < maxPage) goToPage(currentPage + 1);
                }}
                className="w-full h-full object-contain bg-black"
              />
            </AspectRatio>
          </>
        ) : (
          <AspectRatio
            ratio={7 / 10}
            className={cn(
              "rounded-xl overflow-hidden border border-border shadow-lg",
              "bg-[hsl(40,45%,92%)]",
              isAudioPlaying && "ring-2 ring-primary ring-offset-2 ring-offset-background"
            )}
          >
            <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            )}
            {imageError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50 text-muted-foreground p-4">
                <p className="text-center mb-2">Impossible de charger la page</p>
                <Button variant="outline" size="sm" onClick={() => { setIsLoading(true); setImageError(false); }}>
                  Réessayer
                </Button>
              </div>
            ) : (
              <img
                key={imageSrc}
                src={imageSrc}
                alt={`Page ${currentPage} - ${mushafType}`}
                className={cn(
                  "w-full h-full object-contain transition-opacity duration-300",
                  isLoading ? "opacity-0" : "opacity-100"
                )}
                loading="eager"
                decoding="async"
                referrerPolicy="no-referrer"
                draggable={false}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            )}
            </>
          </AspectRatio>
        )}
      </div>

      {/* Quick page navigation */}
      <div className="flex flex-col items-center justify-center gap-1 mt-4">
        <span className="text-xs text-muted-foreground">
          ← Glissez vers la gauche/droite pour changer de page →
        </span>
        {!isArchiveMode && (
          <span className="text-xs text-muted-foreground">
            Sourate {surah?.name} : Pages {surahStartPage} - {surahEndPage}
          </span>
        )}
      </div>

      {/* Verse strip — page scans stay image-only; only verse buttons below may be highlighted. */}
      {!isArchiveMode && pageVerseNumbers && pageVerseNumbers.length > 0 && (
        <div className="mt-4 p-3 bg-card/60 rounded-lg border border-border/60">
          <p className="text-[11px] text-muted-foreground mb-2 text-center">
            Versets de cette page (cliquez pour écouter)
          </p>
          <div
            data-verse-strip
            className="flex flex-nowrap gap-1.5 justify-start overflow-x-auto scroll-smooth py-1"
          >
            {pageVerseNumbers.map((vn) => {
              const themes = getThemesForVerse(surahNumber, vn);
              const primary = themes[0];
              const isCurrent = currentVerse === vn;
              const bg = 'hsl(var(--muted))';
              const border = 'hsl(var(--border))';
              const fg = 'hsl(var(--foreground))';
              return (
                <button
                  key={vn}
                  ref={isCurrent ? currentVerseBtnRef : undefined}
                  type="button"
                  onClick={() => onVerseClick?.(vn)}
                  title={`Verset ${vn}${primary ? ` · ${primary.labels.fr}` : ''}`}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-semibold border-2 transition-all hover:scale-105",
                    isCurrent && "scale-125 ring-4 ring-primary ring-offset-2 ring-offset-background shadow-lg shadow-primary/50 animate-pulse font-bold z-10 relative"
                  )}
                  style={
                    isCurrent
                      ? { backgroundColor: `hsl(var(--primary) / 0.25)`, borderColor: `hsl(var(--primary))`, color: `hsl(var(--primary))` }
                      : { backgroundColor: bg, borderColor: border, color: fg }
                  }
                >
                  {vn}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mushaf type indicator */}
      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-center text-muted-foreground">
          {mushafType === 'hafs' && '🎨 Hafs Tajweed coloré — page image stable avec suivi du verset en dessous'}
          {mushafType === 'warsh' && '📜 Warsh Tajweed coloré (Azraq) — source : archive.org. Pagination propre à l\'édition (≠ 604), navigation libre par glissement.'}
          {mushafType === 'qalun' && '📗 Qalun Tajweed coloré (Dar Al-Ma\'rifa) — source : archive.org. Pagination propre à l\'édition (≠ 604), navigation libre par glissement.'}
        {mushafType === 'hafs-video' && '🎬 Vidéo Hafs page par page (604 pages, audio inclus) — source : archive.org. Utilisez les contrôles vidéo pour la lecture.'}
        {mushafType === 'warsh-video' && '🎬 Vidéo Warsh page par page (604 pages, audio inclus) — source : archive.org.'}
        {mushafType === 'qalun-video' && '🎬 Vidéo Qalun page par page (604 pages, audio inclus) — source : archive.org.'}
        </p>
      </div>
    </div>
  );
};
