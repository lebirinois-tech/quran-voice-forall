import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Play, Pause, SkipBack, SkipForward, Eye, EyeOff, BookOpen, Sparkles, X } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Verse, surahs } from '@/data/surahs';
import { sanitizeTajweedHtml } from '@/lib/sanitize';
import { applyAutoTajweed } from '@/lib/autoTajweed';
import { getThemesForVerse } from '@/data/quranThemes';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { TafsirPanel } from './TafsirPanel';
import { ThematicTafsirPanel } from './ThematicTafsirPanel';
import { VerseCard } from './VerseCard';
import { useAppSettings } from '@/hooks/useAppSettings';

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
  const [menuVerse, setMenuVerse] = useState<number | null>(null);
  const [tafsirVerse, setTafsirVerse] = useState<number | null>(null);
  const [themeVerse, setThemeVerse] = useState<number | null>(null);
  const [detailVerse, setDetailVerse] = useState<number | null>(null);
  const { reciter, textDisplayStyle, fontSize } = useAppSettings();

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
                onClick={() => setMenuVerse(v.number)}
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
          type="button"
          variant="outline"
          onClick={goNext}
          disabled={currentPage >= endPage}
          className="flex-1"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Page suivante
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={goPrev}
          disabled={currentPage <= startPage}
          className="flex-1"
        >
          Page précédente
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {isFullscreen && (
        <>
          <div className="fixed top-3 left-3 z-[2147483001]">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowControls((v) => !v)}
              className="gap-1.5 rounded-full shadow-lg"
              aria-label={showControls ? 'Masquer les contrôles' : 'Afficher les contrôles'}
            >
              {showControls ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="text-xs">{showControls ? 'Masquer' : 'Contrôles'}</span>
            </Button>
          </div>
          {showControls && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[2147483001] flex items-center gap-1 rounded-full border-2 border-primary/30 bg-background/95 backdrop-blur px-3 py-2 shadow-2xl">
              {onPreviousVerse && (
                <Button type="button" size="icon" variant="ghost" onClick={onPreviousVerse} aria-label="Verset précédent">
                  <SkipBack className="h-5 w-5" />
                </Button>
              )}
              {onPlayPause && (
                <Button type="button" size="icon" onClick={onPlayPause} aria-label={isAudioPlaying ? 'Pause' : 'Lecture'} className="h-11 w-11 rounded-full">
                  {isAudioPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
              )}
              {onNextVerse && (
                <Button type="button" size="icon" variant="ghost" onClick={onNextVerse} aria-label="Verset suivant">
                  <SkipForward className="h-5 w-5" />
                </Button>
              )}
              <div className="mx-1 h-6 w-px bg-border" />
              <Button type="button" size="icon" variant="ghost" onClick={goPrev} disabled={currentPage <= startPage} aria-label="Page précédente">
                <ChevronRight className="h-5 w-5" />
              </Button>
              <Button type="button" size="icon" variant="ghost" onClick={goNext} disabled={currentPage >= endPage} aria-label="Page suivante">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Verse action menu */}
      <Dialog open={menuVerse !== null} onOpenChange={(o) => !o && setMenuVerse(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Verset {menuVerse} — {surah?.name}
            </DialogTitle>
          </DialogHeader>
          {menuVerse !== null && (() => {
            const themes = getThemesForVerse(surahNumber, menuVerse);
            return (
              <div className="flex flex-col gap-2">
                {themes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    {themes.map((t) => (
                      <span
                        key={t.id}
                        className="text-xs px-2 py-1 rounded-full border"
                        style={{
                          backgroundColor: `hsl(${t.hsl} / 0.18)`,
                          borderColor: `hsl(${t.hsl} / 0.55)`,
                        }}
                      >
                        {t.emoji} {t.labels.fr}
                      </span>
                    ))}
                  </div>
                )}
                <Button
                  variant="default"
                  onClick={() => {
                    const v = menuVerse;
                    setMenuVerse(null);
                    if (v) onVerseClick?.(v);
                  }}
                  className="justify-start gap-2"
                >
                  <Play className="h-4 w-4" />
                  Écouter ce verset
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const v = menuVerse;
                    setMenuVerse(null);
                    setDetailVerse(v);
                  }}
                  className="justify-start gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  Détails du verset (traduction, partage…)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const v = menuVerse;
                    setMenuVerse(null);
                    setTafsirVerse(v);
                  }}
                  className="justify-start gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  Tafsir (Al-Muyassar)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const v = menuVerse;
                    setMenuVerse(null);
                    setThemeVerse(v);
                  }}
                  className="justify-start gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Tafsir thématique (Mawdou3i)
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setMenuVerse(null)}
                  className="justify-start gap-2 text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                  Annuler
                </Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Full verse-mode content (translation, TTS, share, download, bookmark) */}
      <Dialog open={detailVerse !== null} onOpenChange={(o) => !o && setDetailVerse(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {surah?.name} · Verset {detailVerse}
            </DialogTitle>
          </DialogHeader>
          {detailVerse !== null && (() => {
            const v = verses.find((x) => x.number === detailVerse);
            if (!v) return null;
            return (
              <VerseCard
                verse={v}
                surahNumber={surahNumber}
                reciter={reciter}
                textDisplayStyle={textDisplayStyle}
                fontSize={fontSize}
                tajweedHtml={versesTajweed[v.number]}
                pageNumber={v.page}
                isPlaying={isAudioPlaying && currentVerse === v.number}
                onPlay={() => {
                  setDetailVerse(null);
                  onVerseClick?.(v.number);
                }}
              />
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Tafsir Al-Muyassar dialog */}
      <Dialog open={tafsirVerse !== null} onOpenChange={(o) => !o && setTafsirVerse(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Tafsir — {surah?.name} · Verset {tafsirVerse}
            </DialogTitle>
          </DialogHeader>
          {tafsirVerse !== null && (
            <TafsirPanel
              surahNumber={surahNumber}
              verseNumber={tafsirVerse}
              isOpen={true}
              onToggle={() => setTafsirVerse(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Thematic tafsir dialog */}
      <Dialog open={themeVerse !== null} onOpenChange={(o) => !o && setThemeVerse(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Tafsir thématique — {surah?.name} · Verset {themeVerse}
            </DialogTitle>
          </DialogHeader>
          {themeVerse !== null && (
            <ThematicTafsirPanel
              surahNumber={surahNumber}
              verseNumber={themeVerse}
              isOpen={true}
              onToggle={() => setThemeVerse(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
