import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { AspectRatio } from './ui/aspect-ratio';
import { cn } from '@/lib/utils';
import { getVersePage, surahs } from '@/data/surahs';
import { getThemesForVerse } from '@/data/quranThemes';

type MushafType = 'hafs' | 'warsh' | 'qalun';

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

const getPageUrls = (page: number, mushafType: MushafType): string[] => {
  const padded = padPage3(page);
  switch (mushafType) {
    case 'hafs':
      // Hafs Tajweed coloré, édition Médine (KFGQPC) — miroirs jsDelivr + easyquran
      return [
        `https://cdn.jsdelivr.net/gh/QuranHub/quran-pages-images@main/easyquran.com/hafs-tajweed/${page}.jpg`,
        `https://raw.githubusercontent.com/QuranHub/quran-pages-images/main/easyquran.com/hafs-tajweed/${page}.jpg`,
        `https://easyquran.com/wp-content/uploads/2022/09/${page}-scaled.jpg`,
      ];
    case 'qalun':
      // Mushaf Qalun Tajweed coloré — hébergé sur Lovable Cloud (archive.org / qalooon-taj)
      return [
        `https://kqhdyzpmfwsrldbmnebc.supabase.co/storage/v1/object/public/mushaf-pages/qalun-tajweed/${padded}.jpg`,
      ];
    case 'warsh':
    default:
      // Mushaf Warsh édition Médine (KFGQPC)
      return [
        `https://cdn.jsdelivr.net/gh/QuranHub/quran-pages-images@main/kfgqpc/warsh/${page}.jpg`,
        `https://raw.githubusercontent.com/QuranHub/quran-pages-images/main/kfgqpc/warsh/${page}.jpg`,
      ];
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
  const { start: surahStartPage, end: surahEndPage } = useMemo(
    () => getSurahPages(surahNumber),
    [surahNumber]
  );
  
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
    setImageSrc(getPageUrls(currentPage, mushafType)[0] ?? '');
  }, [currentPage, mushafType]);

  const goToPage = useCallback((newPage: number) => {
    if (newPage < 1 || newPage > 604 || newPage === currentPage) return;
    hasManuallyNavigatedRef.current = true;
    setCurrentPage(newPage);
    onPageChange?.(newPage);
  }, [currentPage, onPageChange]);

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
    const sources = getPageUrls(currentPage, mushafType);
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
          {mushafType === 'warsh' && '📜 Mushaf Warsh (Médine)'}
          {mushafType === 'qalun' && '📗 Mushaf Qalun Tajweed'}
        </div>
        <span className="text-sm font-medium text-foreground">
          Page {currentPage} / 604
        </span>
      </div>

      {/* Currently playing verse indicator */}
      {pageVerseRange && currentVerse && currentVerse >= pageVerseRange.first && currentVerse <= pageVerseRange.last && (
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
          <AspectRatio
            ratio={3 / 4}
            className={cn(
              "rounded-xl overflow-hidden border border-border shadow-lg",
              currentPage % 2 === 0 ? "bg-card" : "bg-muted/30",
              isAudioPlaying && "ring-2 ring-primary ring-offset-2 ring-offset-background"
            )}
          >
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
                src={imageSrc}
                alt={`Page ${currentPage} - ${mushafType}`}
                className={cn(
                  "w-full h-full object-contain transition-opacity duration-300",
                  isLoading ? "opacity-0" : "opacity-100"
                )}
                referrerPolicy="no-referrer"
                draggable={false}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            )}
          </AspectRatio>
      </div>

      {/* Quick page navigation */}
      <div className="flex flex-col items-center justify-center gap-1 mt-4">
        <span className="text-xs text-muted-foreground">
          ← Glissez vers la gauche/droite pour changer de page →
        </span>
        <span className="text-xs text-muted-foreground">
          Sourate {surah?.name} : Pages {surahStartPage} - {surahEndPage}
        </span>
      </div>

      {/* Mushaf type indicator */}
      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-center text-muted-foreground">
          {mushafType === 'hafs' && '🎨 Hafs avec Tajweed coloré — édition Médine (KFGQPC)'}
          {mushafType === 'warsh' && '📜 Warsh — édition Médine (KFGQPC, sans couleurs Tajweed)'}
          {mushafType === 'qalun' && '📗 Mushaf Qalun Tajweed coloré — lecture de Nafi\'. Source : archive.org (qalooon-taj).'}
        </p>
      </div>
    </div>
  );
};
