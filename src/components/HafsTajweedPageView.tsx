import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Play, Pause, SkipBack, SkipForward, BookOpen, Sparkles, X, Menu, Mic, ArrowUp, RotateCcw, MoreHorizontal, FolderOpen } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Verse, surahs } from '@/data/surahs';
import { sanitizeTajweedHtml } from '@/lib/sanitize';
import { applyAutoTajweed } from '@/lib/autoTajweed';
import { getThemesForVerse } from '@/data/quranThemes';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { TafsirPanel } from './TafsirPanel';
import { ThematicTafsirPanel } from './ThematicTafsirPanel';
import { VerseCard } from './VerseCard';
import { useAppSettings } from '@/hooks/useAppSettings';
import { VerseRecorder } from './VerseRecorder';

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
  onPageRequest?: (page: number) => void;
  onManualPageChange?: (page: number) => void;
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
  onPageRequest,
  onManualPageChange,
}: HafsTajweedPageViewProps) => {
  const surah = surahs.find((s) => s.number === surahNumber);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [menuVerse, setMenuVerse] = useState<number | null>(null);
  const [tafsirVerse, setTafsirVerse] = useState<number | null>(null);
  const [themeVerse, setThemeVerse] = useState<number | null>(null);
  const [detailVerse, setDetailVerse] = useState<number | null>(null);
  const { reciter, textDisplayStyle, fontSize } = useAppSettings();
  const [menuOpen, setMenuOpen] = useState(false);
  const [recorderVerse, setRecorderVerse] = useState<number | null>(null);

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

  // Clamp current page if verses arrive later, but allow edge navigation to ask
  // the parent to open the previous/next sourate when the page is outside this sourate.
  useEffect(() => {
    if (currentPage < startPage) setCurrentPage(startPage);
    else if (currentPage > endPage) setCurrentPage(endPage);
  }, [startPage, endPage, currentPage]);

  useEffect(() => {
    onPageChange?.(currentPage);
  }, [currentPage, onPageChange]);

  // In continuous audio, follow the verse page automatically instead of keeping
  // the display on the first page while playback advances.
  useEffect(() => {
    if (!currentVerse || !isAudioPlaying) return;
    const versePage = verses.find((v) => v.number === currentVerse)?.page;
    if (!versePage || versePage === currentPage) return;
    if (versePage >= startPage && versePage <= endPage) {
      setCurrentPage(versePage);
    }
  }, [currentVerse, currentPage, endPage, isAudioPlaying, startPage, verses]);

  const goToPage = useCallback(
    (p: number) => {
      if (p < 1 || p > 604 || p === currentPage) return;
      manualNavRef.current = true;
      if (p >= startPage && p <= endPage) {
        setCurrentPage(p);
        onManualPageChange?.(p);
      } else {
        onPageRequest?.(p);
      }
    },
    [currentPage, onManualPageChange, onPageRequest, startPage, endPage]
  );

  const goPrev = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);
  const goNext = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

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

  // Count distinct themes across the current page for the decorative header.
  const pageThemesCount = useMemo(() => {
    const set = new Set<string>();
    pageVerses.forEach((v) => {
      getThemesForVerse(surahNumber, v.number).forEach((t) => set.add(t.id));
    });
    return set.size;
  }, [pageVerses, surahNumber]);

  const isSurahStartPage = currentPage === startPage;

  return (
    <div
      className={cn(
        'w-full max-w-3xl mx-auto',
        isFullscreen && 'fixed inset-0 z-[45] h-[100dvh] max-w-none bg-background overflow-y-auto p-3'
      )}
    >
      {/* Minimal header: page indicator + fullscreen toggle */}
      <div className="flex items-center justify-between mb-2 px-2">
        <span className="text-xs text-muted-foreground">
          {surah?.name}
          {currentVerse && pageVerses.some((v) => v.number === currentVerse) ? (
            <> · <span className={cn('font-semibold', isAudioPlaying && 'text-primary')}>v. {currentVerse}</span></>
          ) : null}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">
            Page {currentPage}/604
          </span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setIsFullscreen((v) => !v)}
            aria-label={isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
            className="h-7 w-7"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Page card */}
      <div
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="relative rounded-2xl border-2 border-primary/20 shadow-soft p-3 md:p-6 overflow-y-auto"
        style={{
          backgroundColor: 'hsl(40, 45%, 92%)',
          maxHeight: isFullscreen
            ? 'calc(100dvh - 90px)'
            : 'calc(100dvh - 220px)',
          minHeight: 'calc(100dvh - 240px)',
        }}
      >
        {showBismillah && (
          <p
            dir="rtl"
            className="text-center font-amiri text-4xl md:text-5xl font-extrabold text-foreground mb-6"
            style={{ fontWeight: 800 }}
          >
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
        )}

        {isSurahStartPage && surah && (
          <div className="mb-5 select-none" dir="rtl">
            <div
              className="relative flex items-center justify-between gap-2 px-3 py-2 rounded-lg border-2"
              style={{
                borderColor: 'hsl(43, 65%, 45%)',
                background:
                  'linear-gradient(90deg, hsl(43, 55%, 88%) 0%, hsl(43, 65%, 78%) 50%, hsl(43, 55%, 88%) 100%)',
                boxShadow: 'inset 0 0 0 1px hsl(43, 65%, 65%)',
              }}
            >
              <div className="flex flex-col items-center text-[10px] leading-tight text-foreground/80 min-w-[52px]">
                <span>عدد المواضيع</span>
                <span className="text-base font-bold text-foreground">{pageThemesCount}</span>
              </div>
              <div className="flex-1 text-center font-amiri text-2xl md:text-3xl font-bold text-foreground tracking-wide">
                سورة {surah.nameArabic ?? surah.name}
              </div>
              <div className="flex flex-col items-center text-[10px] leading-tight text-foreground/80 min-w-[52px]">
                <span>عدد الآيات</span>
                <span className="text-base font-bold text-foreground">{verses.length}</span>
              </div>
            </div>
          </div>
        )}

        <div
          dir="rtl"
          lang="ar"
          className="quran-text tajweed-text text-4xl md:text-5xl lg:text-6xl font-extrabold leading-loose text-justify text-foreground [&_span]:font-bold"
          style={{ wordSpacing: '0.15em', fontWeight: 800 }}
        >
          {pageVerses.map((v) => {
            const isCurrent = currentVerse === v.number;
            // Always use the same auto-tajweed coloring as verse mode for
            // consistent, richer rule highlighting.
            // Prefer the pre-computed Tajweed HTML from the API (Hafs) or
            // the qiraat variant (Warsh/Qalun) when available; otherwise
            // fall back to auto-Tajweed on the plain text.
            const providedTajweed = versesTajweed?.[v.number];
            const html = providedTajweed
              ? sanitizeTajweedHtml(providedTajweed)
              : sanitizeTajweedHtml(applyAutoTajweed(v.text));
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

      {/* Persistent bottom controls: RTL page navigation + menu above the audio player. */}
      <div
        className="fixed left-2 right-2 z-[45] mx-auto flex max-w-md items-center justify-between gap-2 bg-background/95 backdrop-blur border-2 border-primary/30 rounded-full shadow-2xl px-2 py-2"
        style={{
          bottom: isFullscreen
            ? 'calc(env(safe-area-inset-bottom, 0px) + 12px)'
            : 'calc(env(safe-area-inset-bottom, 0px) + 150px)',
        }}
      >
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={goNext}
          disabled={currentPage >= 604}
          aria-label="Page suivante"
          title="Page suivante"
          className="h-12 w-12 shrink-0 rounded-full border-primary/40 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => setIsFullscreen((v) => !v)}
          aria-label={isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
          title={isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
          className="h-10 w-10 shrink-0 rounded-full text-primary"
        >
          {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <FolderOpen className="h-5 w-5" />}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={() => setMenuOpen(true)}
          aria-label="Ouvrir le menu"
          title="Menu"
          className="h-12 w-12 shrink-0 rounded-full border-primary/40 bg-card text-primary shadow-md"
        >
          <MoreHorizontal className="h-6 w-6" />
        </Button>
        {onPlayPause && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onPlayPause}
            aria-label={isAudioPlaying ? 'Pause' : 'Lecture'}
              title={isAudioPlaying ? 'Pause' : 'Lecture'}
              className="h-10 w-10 shrink-0 rounded-full border-2 border-dashed border-primary text-primary hover:bg-primary/10"
          >
            {isAudioPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
        )}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => {
            const v = currentVerse ?? pageVerses[0]?.number;
            if (v) setRecorderVerse(v);
          }}
          aria-label="Enregistrer"
          title="Enregistrer"
          className="h-10 w-10 shrink-0 rounded-full text-destructive"
        >
          <Mic className="h-5 w-5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={goPrev}
          disabled={currentPage <= 1}
          aria-label="Page précédente"
          title="Page précédente"
          className="h-12 w-12 shrink-0 rounded-full border-primary/40 bg-card text-primary disabled:opacity-40"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>

      {/* Quick access Sheet: settings, audio, recording */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" className="z-[70] max-h-[82dvh] rounded-t-2xl overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
          <SheetHeader>
            <SheetTitle>Menu rapide</SheetTitle>
            <SheetDescription>Paramètres, audio et enregistrement</SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            <section>
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Audio</h4>
              <div className="flex items-center gap-2">
                {onPreviousVerse && (
                  <Button size="icon" variant="outline" onClick={onPreviousVerse} aria-label="Verset précédent">
                    <SkipBack className="h-4 w-4" />
                  </Button>
                )}
                {onPlayPause && (
                  <Button
                    size="icon"
                    onClick={() => { onPlayPause(); }}
                    className="h-11 w-11 rounded-full"
                    aria-label={isAudioPlaying ? 'Pause' : 'Lecture'}
                  >
                    {isAudioPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </Button>
                )}
                {onNextVerse && (
                  <Button size="icon" variant="outline" onClick={onNextVerse} aria-label="Verset suivant">
                    <SkipForward className="h-4 w-4" />
                  </Button>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {currentVerse ? `Verset ${currentVerse}` : '—'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Vitesse, répétition et récitateur sont dans le lecteur en bas d'écran.
              </p>
            </section>

            <section>
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Navigation</h4>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => { goPrev(); }} disabled={currentPage <= 1} className="flex-1">
                  <ChevronRight className="h-4 w-4 mr-1" /> Précédente
                </Button>
                <Button variant="outline" onClick={() => { goNext(); }} disabled={currentPage >= 604} className="flex-1">
                  Suivante <ChevronLeft className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </section>

            <section>
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Enregistrement (Hifz)</h4>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => {
                  const v = currentVerse ?? pageVerses[0]?.number;
                  if (v) {
                    setMenuOpen(false);
                    setRecorderVerse(v);
                  }
                }}
              >
                <Mic className="h-4 w-4" />
                Enregistrer le verset {currentVerse ?? pageVerses[0]?.number ?? ''}
              </Button>
            </section>

            <section>
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Paramètres</h4>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => {
                  setMenuOpen(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <ArrowUp className="h-4 w-4" />
                Aller aux paramètres (haut de page)
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 mt-2"
                onClick={() => {
                  setMenuOpen(false);
                  setIsFullscreen((v) => !v);
                }}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                {isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 mt-2"
                onClick={() => {
                  setMenuOpen(false);
                  window.location.href = '/reset';
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Réinitialiser l'application
              </Button>
            </section>
          </div>
        </SheetContent>
      </Sheet>

      {/* Recorder dialog */}
      <Dialog open={recorderVerse !== null} onOpenChange={(o) => !o && setRecorderVerse(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Enregistrement — {surah?.name} · Verset {recorderVerse}
            </DialogTitle>
          </DialogHeader>
          {recorderVerse !== null && (() => {
            const v = verses.find((x) => x.number === recorderVerse);
            if (!v) return null;
            return (
              <VerseRecorder
                surahNumber={surahNumber}
                verseNumber={v.number}
                verseText={v.text}
                reciter={reciter}
                pageVerses={pageVerses.map((pv) => ({ number: pv.number, text: pv.text }))}
              />
            );
          })()}
        </DialogContent>
      </Dialog>

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
