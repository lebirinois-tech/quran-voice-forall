import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Play, Pause, SkipBack, SkipForward, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Verse, surahs } from '@/data/surahs';
import { sanitizeTajweedHtml } from '@/lib/sanitize';
import { applyAutoTajweed } from '@/lib/autoTajweed';
import { getThemesForVerse } from '@/data/quranThemes';

interface HafsTajweedPageViewProps {
  surahNumber: number;
  verses: Verse[];
  versesTajweed: Record<number, string>;
  initialPage?: number;
  onPageChange?: (page: number) => void;
  currentVerse?: number;
  isAudioPlaying?: boolean;
  onVerseClick?: (verseNumber: number) => void;
  onPlayPause?: () => void;
  onNextVerse?: () => void;
  onPreviousVerse?: () => void;
}

// Convert a Western digit to Arabic-Indic digits (٠-٩) for the verse marker.
const toArabicDigits = (n: number) =>
  String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);

export const HafsTajweedPageView = ({
  surahNumber,
  verses,
  versesTajweed,
  initialPage,
  onPageChange,
  currentVerse,
  isAudioPlaying,
  onVerseClick,
  onPlayPause,
  onNextVerse,
  onPreviousVerse,
}: HafsTajweedPageViewProps) => {
  const surah = surahs.find((s) => s.number === surahNumber);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const { startPage, endPage } = useMemo(() => {
    if (verses.length === 0) return { startPage: 1, endPage: 1 };
    const pages = verses.map((v) => v.page ?? 1);
    return { startPage: Math.min(...pages), endPage: Math.max(...pages) };
  }, [verses]);

  const [currentPage, setCurrentPage] = useState<number>(
    initialPage && initialPage >= startPage && initialPage <= endPage
      ? initialPage
      : startPage
  );

  const prevSurahRef = useRef(surahNumber);
  const manualNavRef = useRef(
    !!(initialPage && initialPage >= startPage && initialPage <= endPage)
  );

  // Reset page on surah change
  useEffect(() => {
    if (prevSurahRef.current !== surahNumber) {
      prevSurahRef.current = surahNumber;
      manualNavRef.current = !!(initialPage && initialPage >= startPage && initialPage <= endPage);
      setCurrentPage(
        initialPage && initialPage >= startPage && initialPage <= endPage
          ? initialPage
          : startPage
      );
    } else if (
      initialPage &&
      initialPage >= startPage &&
      initialPage <= endPage &&
      !manualNavRef.current
    ) {
      setCurrentPage(initialPage);
      manualNavRef.current = true;
    }
  }, [surahNumber, initialPage, startPage, endPage]);

  // Clamp current page if verses arrive later
  useEffect(() => {
    if (currentPage < startPage) setCurrentPage(startPage);
    else if (currentPage > endPage) setCurrentPage(endPage);
  }, [startPage, endPage, currentPage]);

  useEffect(() => {
    onPageChange?.(currentPage);
  }, [currentPage, onPageChange]);

  const goToPage = useCallback(
    (p: number) => {
      if (p < startPage || p > endPage || p === currentPage) return;
      manualNavRef.current = true;
      setCurrentPage(p);
    },
    [currentPage, startPage, endPage]
  );

  const goPrev = useCallback(() => {
    manualNavRef.current = true;
    setCurrentPage((cur) => (cur > startPage ? cur - 1 : cur));
  }, [startPage]);
  const goNext = useCallback(() => {
    manualNavRef.current = true;
    setCurrentPage((cur) => (cur < endPage ? cur + 1 : cur));
  }, [endPage]);

  const pageVerses = useMemo(
    () => verses.filter((v) => (v.page ?? 1) === currentPage),
    [verses, currentPage]
  );

  // Auto-scroll current verse into view
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!currentVerse) return;
    const el = containerRef.current?.querySelector<HTMLElement>(
      `[data-verse="${currentVerse}"]`
    );
    if (el && containerRef.current) {
      const c = containerRef.current;
      const top = el.offsetTop - c.offsetTop - 40;
      c.scrollTo({ top, behavior: 'smooth' });
    }
  }, [currentVerse, currentPage]);

  // Swipe (RTL: swipe left = next page)
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const sx = touchStartXRef.current;
    const sy = touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    if (sx == null || sy == null) return;
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) goNext();
    else goPrev();
  };

  const showBismillah = currentPage === startPage && surahNumber !== 1 && surahNumber !== 9;

  return (
    <div
      className={cn(
        'w-full max-w-3xl mx-auto',
        isFullscreen && 'fixed inset-0 z-[2147483000] max-w-none bg-background overflow-y-auto p-3'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="text-sm text-muted-foreground">
          📖 Mushaf Hafs Tajweed — {surah?.name}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            Page {currentPage} / {endPage}
          </span>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => setIsFullscreen((v) => !v)}
            aria-label={isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
            className="h-8 w-8"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Current verse pill */}
      {currentVerse &&
        pageVerses.some((v) => v.number === currentVerse) && (
          <div
            className={cn(
              'mb-3 flex items-center justify-center gap-2 px-4 py-2 rounded-full border-2 transition-all',
              isAudioPlaying
                ? 'bg-primary/15 border-primary text-primary animate-pulse'
                : 'bg-muted/50 border-border text-foreground'
            )}
          >
            <span className="text-sm font-semibold">
              🔊 Verset en cours : <span className="font-bold">{currentVerse}</span>
            </span>
          </div>
        )}

      {/* Page card */}
      <div
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="relative rounded-2xl border-2 border-primary/20 shadow-soft p-6 md:p-8 overflow-y-auto"
        style={{
          backgroundColor: 'hsl(40, 45%, 92%)',
          maxHeight: '75vh',
          minHeight: '60vh',
        }}
      >
        {showBismillah && (
          <p
            dir="rtl"
            className="text-center font-amiri text-3xl md:text-4xl text-foreground mb-6"
          >
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
        )}

        <div
          dir="rtl"
          lang="ar"
          className="quran-text text-3xl md:text-4xl leading-loose text-justify text-foreground"
          style={{ wordSpacing: '0.15em' }}
        >
          {pageVerses.map((v) => {
            const isCurrent = currentVerse === v.number;
            const html =
              versesTajweed[v.number] ||
              sanitizeTajweedHtml(applyAutoTajweed(v.text));
            const themes = getThemesForVerse(surahNumber, v.number);
            const primary = themes[0];
            const themeBg = primary
              ? themes.length > 1
                ? `linear-gradient(135deg, hsl(${themes[0].hsl} / 0.22) 0%, hsl(${themes[1].hsl} / 0.22) 100%)`
                : `hsl(${primary.hsl} / 0.20)`
              : undefined;
            return (
              <span
                key={v.number}
                data-verse={v.number}
                onClick={() => onVerseClick?.(v.number)}
                title={
                  themes.length
                    ? themes.map((t) => `${t.emoji} ${t.labels.fr} · ${t.labels.ar}`).join(' • ')
                    : undefined
                }
                className={cn(
                  'inline transition-all cursor-pointer rounded-md px-1 -mx-1',
                  isCurrent &&
                    (isAudioPlaying
                      ? 'bg-primary/25 ring-2 ring-primary shadow-md'
                      : 'bg-primary/10 ring-1 ring-primary/40')
                )}
                style={
                  !isCurrent && themeBg
                    ? {
                        background: themeBg,
                        boxShadow: `inset 0 -2px 0 hsl(${primary.hsl} / 0.55)`,
                      }
                    : undefined
                }
              >
                <span dangerouslySetInnerHTML={{ __html: html }} />
                <span className="inline-flex items-center justify-center mx-1 align-middle text-primary font-bold">
                  ۝{toArabicDigits(v.number)}
                </span>{' '}
              </span>
            );
          })}
          {pageVerses.length === 0 && (
            <p className="text-center text-muted-foreground text-base">
              Aucun verset sur cette page pour cette sourate.
            </p>
          )}
        </div>
      </div>

      {/* Pagination controls — RTL: previous on right, next on left */}
      <div className="flex items-center justify-between mt-4 gap-3">
        <Button
          variant="outline"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= endPage}
          className="flex-1"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Page suivante
        </Button>
        <Button
          variant="outline"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= startPage}
          className="flex-1"
        >
          Page précédente
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};
