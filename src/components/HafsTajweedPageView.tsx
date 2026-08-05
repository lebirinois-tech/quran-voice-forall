import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Play, Pause, SkipBack, SkipForward, BookOpen, Sparkles, X, Menu, Mic, RotateCcw, Volume2 } from 'lucide-react';
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
import { useFullscreen } from '@/hooks/useFullscreen';
import { VerseRecorder } from './VerseRecorder';

interface HafsTajweedPageViewProps {
  surahNumber: number;
  verses: Verse[];
  versesTajweed: Record<number, string>;
  /**
   * When true, use the pre-computed Tajweed HTML from `versesTajweed` instead
   * of auto-Tajweed on `v.text`. Used for Warsh/Qalun where the qiraat variant
   * already ships coloured HTML.
   */
  preferProvidedTajweed?: boolean;
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
  audioControls?: ReactNode;
  voiceControls?: ReactNode;
  settingsControls?: ReactNode;
}

// Convert a Western digit to Arabic-Indic digits (٠-٩) for the verse marker.
const toArabicDigits = (n: number) =>
  String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);

export const HafsTajweedPageView = ({
  surahNumber,
  verses,
  versesTajweed,
  preferProvidedTajweed = false,
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
  audioControls,
  voiceControls,
  settingsControls,
}: HafsTajweedPageViewProps) => {
  const surah = surahs.find((s) => s.number === surahNumber);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(rootRef);

  const [menuVerse, setMenuVerse] = useState<number | null>(null);
  const [tafsirVerse, setTafsirVerse] = useState<number | null>(null);
  const [themeVerse, setThemeVerse] = useState<number | null>(null);
  const [detailVerse, setDetailVerse] = useState<number | null>(null);
  const { reciter, textDisplayStyle, fontSize } = useAppSettings();
  const [menuOpen, setMenuOpen] = useState(false);
  const [recorderVerse, setRecorderVerse] = useState<number | null>(null);
  // Bouton d'appel du menu : masquable pour libérer toute la page.
  const [showMenuButton, setShowMenuButton] = useState(true);

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

  // Group consecutive verses sharing the same thematic tafsir (Tafsir Mawdou'i)
  const themeGroups = useMemo(() => {
    const groups: { theme: ReturnType<typeof getThemesForVerse>[number] | null; verses: typeof pageVerses }[] = [];
    for (const v of pageVerses) {
      const theme = getThemesForVerse(surahNumber, v.number)[0] ?? null;
      const last = groups[groups.length - 1];
      if (last && (last.theme?.id ?? null) === (theme?.id ?? null)) {
        last.verses.push(v);
      } else {
        groups.push({ theme, verses: [v] });
      }
    }
    return groups;
  }, [pageVerses, surahNumber]);

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

  // Ajustement déterministe : cherche la plus grande taille qui garde tout le
  // texte dans le cadre. On n'observe volontairement pas le texte lui-même :
  // sa taille dépend de la police et créait auparavant une boucle de mesures.
  const frameRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const quranTextRef = useRef<HTMLDivElement | null>(null);
  // Taille de police calculée : conservée en état pour que React ne réécrase
  // pas la valeur mesurée à chaque rendu (cause des versets coupés).
  const [fontPx, setFontPx] = useState<number | null>(null);
  // Interligne adaptatif : sur les pages courtes, on étire les lignes pour
  // remplir le cadre au lieu de laisser un vide en haut et en bas.
  const [lineHeightVal, setLineHeightVal] = useState(1.5);
  useLayoutEffect(() => {
    const viewport = containerRef.current;
    const box = boxRef.current;
    const quranText = quranTextRef.current;
    if (!viewport || !box || !quranText) return;

    let raf = 0;
    const fit = () => {
      if (box.clientHeight <= 0 || box.clientWidth <= 0) return;

      const minPx = 16;
      const maxPx = Math.min(30, Math.max(22, box.clientWidth * 0.082));
      const BASE_LH = 1.5;
      const MAX_LH = 2.6;
      const measure = (size: number) => {
        box.style.fontSize = `${size}px`;
        quranText.style.lineHeight = String(BASE_LH);
        // Force le navigateur à terminer la mise en page avant la mesure.
        void quranText.offsetHeight;
        const boxStyle = window.getComputedStyle(box);
        const available =
          box.clientHeight -
          parseFloat(boxStyle.paddingTop || '0') -
          parseFloat(boxStyle.paddingBottom || '0');
        const bismillah = box.querySelector<HTMLElement>('[data-bismillah]');
        const bismillahHeight = bismillah
          ? bismillah.getBoundingClientRect().height +
            parseFloat(window.getComputedStyle(bismillah).marginBottom || '0')
          : 0;
        return {
          available,
          used: Math.max(quranText.scrollHeight, quranText.getBoundingClientRect().height) +
            bismillahHeight,
        };
      };

      let low = minPx;
      let high = maxPx;
      let best = minPx;
      // Une marge fixe de 6 px protège les jambages arabes et le dernier verset.
      for (let i = 0; i < 12; i++) {
        const candidate = (low + high) / 2;
        const { available, used } = measure(candidate);
        if (used <= available - 6) {
          best = candidate;
          low = candidate;
        } else {
          high = candidate;
        }
      }

      // Vérification finale après l'arrondi des glyphes par le navigateur.
      let finalPx = Math.floor(best * 10) / 10;
      for (let i = 0; i < 8; i++) {
        const { available, used } = measure(finalPx);
        if (used <= available - 4 || finalPx <= minPx) break;
        finalPx = Math.max(minPx, finalPx - 0.5);
      }
      box.style.fontSize = `${finalPx}px`;
      // Remplissage vertical : étire l'interligne si de l'espace reste libre.
      const { available, used } = measure(finalPx);
      const targetLh =
        used > 0
          ? Math.min(MAX_LH, Math.max(BASE_LH, (BASE_LH * (available - 8)) / used))
          : BASE_LH;
      quranText.style.lineHeight = String(targetLh);
      setLineHeightVal((prev) => (Math.abs(prev - targetLh) < 0.02 ? prev : targetLh));
      setFontPx((prev) => (prev !== null && Math.abs(prev - finalPx) < 0.2 ? prev : finalPx));
    };

    // Double passe : la première mesure, la seconde confirme après reflow.
    raf = requestAnimationFrame(() => {
      fit();
      raf = requestAnimationFrame(fit);
    });
    // Une passe après le chargement de la police arabe suffit ; les dimensions
    // du cadre sont ensuite surveillées indépendamment du contenu.
    const timers = [250, 1500, 4500].map((delay) => window.setTimeout(fit, delay));
    document.fonts?.ready.then(fit).catch(() => undefined);
    // Surveillance : si le contenu final ne remplit pas (ou déborde) le cadre
    // après le rendu des spans Tajweed, on relance un ajustement complet.
    let checks = 0;
    const watchdog = window.setInterval(() => {
      checks += 1;
      if (checks > 20) {
        window.clearInterval(watchdog);
        return;
      }
      if (box.clientHeight <= 0) return;
      const style = window.getComputedStyle(box);
      const available =
        box.clientHeight - parseFloat(style.paddingTop || '0') - parseFloat(style.paddingBottom || '0');
      const used = Math.max(quranText.scrollHeight, quranText.getBoundingClientRect().height);
      if (Math.abs(available - used) > 14) fit();
    }, 700);
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fit);
    });
    ro.observe(viewport);
    ro.observe(box);
    window.addEventListener('orientationchange', fit);
    window.addEventListener('resize', fit);
    window.visualViewport?.addEventListener('resize', fit);
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearInterval(watchdog);
      ro.disconnect();
      window.removeEventListener('orientationchange', fit);
      window.removeEventListener('resize', fit);
      window.visualViewport?.removeEventListener('resize', fit);
    };
  }, [currentPage, pageVerses, isFullscreen, showMenuButton]);

  // Contrôle après le rendu React : certains assemblages de spans Tajweed
  // changent brutalement de nombre de lignes à une taille précise. Cette passe
  // valide la hauteur réellement peinte et réduit seulement en cas de besoin.
  useLayoutEffect(() => {
    if (fontPx === null) return;
    const box = boxRef.current;
    const text = quranTextRef.current;
    if (!box || !text) return;

    const raf = requestAnimationFrame(() => {
      const style = window.getComputedStyle(box);
      const available =
        box.clientHeight -
        parseFloat(style.paddingTop || '0') -
        parseFloat(style.paddingBottom || '0');
      const bismillah = box.querySelector<HTMLElement>('[data-bismillah]');
      const bismillahHeight = bismillah
        ? bismillah.getBoundingClientRect().height +
          parseFloat(window.getComputedStyle(bismillah).marginBottom || '0')
        : 0;
      const used = Math.max(text.scrollHeight, text.getBoundingClientRect().height) + bismillahHeight;
      if (used > available - 4 && fontPx > 16) {
        const ratio = Math.sqrt(Math.max(0.25, (available - 8) / used));
        const reduced = Math.max(16, Math.floor(fontPx * ratio * 10) / 10);
        setFontPx(reduced < fontPx ? reduced : Math.max(16, fontPx - 0.5));
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [fontPx, currentPage, pageVerses]);

  // Garde-fou permanent contre les changements tardifs de police/Tajweed.
  // Il ne réagrandit jamais le texte, donc il ne peut pas créer d'oscillation.
  useEffect(() => {
    const box = boxRef.current;
    const text = quranTextRef.current;
    if (!box || !text) return;
    let raf = 0;
    const shrinkIfNeeded = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const style = window.getComputedStyle(box);
        const available =
          box.clientHeight -
          parseFloat(style.paddingTop || '0') -
          parseFloat(style.paddingBottom || '0');
        const bismillah = box.querySelector<HTMLElement>('[data-bismillah]');
        const bismillahHeight = bismillah
          ? bismillah.getBoundingClientRect().height +
            parseFloat(window.getComputedStyle(bismillah).marginBottom || '0')
          : 0;
        const used = Math.max(text.scrollHeight, text.getBoundingClientRect().height) + bismillahHeight;
        if (used <= available - 4) return;
        setFontPx((current) => {
          if (current === null || current <= 16) return current;
          const ratio = Math.sqrt(Math.max(0.25, (available - 8) / used));
          return Math.max(16, Math.floor(current * ratio * 10) / 10);
        });
      });
    };
    const observer = new ResizeObserver(shrinkIfNeeded);
    observer.observe(text);
    const timers = [500, 1200, 2500, 5000].map((delay) =>
      window.setTimeout(shrinkIfNeeded, delay)
    );
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [currentPage, pageVerses]);

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
      ref={rootRef}
      className={cn(
        'fixed inset-0 z-[45] h-[100dvh] w-screen bg-background overflow-hidden',
        isFullscreen && 'z-[60]'
      )}
    >
      {/* Page seule : aucune barre persistante, seules les commandes à la demande restent en bas. */}
      <div
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={(e) => {
          // Un appui hors texte fait apparaître / disparaître le bouton de menu.
          if (e.target === e.currentTarget) setShowMenuButton((v) => !v);
        }}
        className={cn(
          'relative flex h-[100dvh] w-full flex-col justify-start overflow-hidden pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]',
          showMenuButton
            ? 'pb-[calc(env(safe-area-inset-bottom,0px)+3.75rem)]'
            : 'pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]'
        )}
        style={{
          backgroundColor: 'hsl(40, 45%, 92%)',
          paddingInline: 'calc(env(safe-area-inset-left, 0px) + clamp(0.5rem, 3vw, 1.5rem))',
        }}
      >
        {/* Cadre de page façon Mushaf : bordure double, contenu centré */}
        <div
          ref={frameRef}
          className="mx-auto h-full w-full max-w-4xl overflow-hidden"
        >
          <div
            ref={contentRef}
            className="h-full w-full rounded-xl border-2 p-1 shadow-md sm:p-1.5"
            style={{ borderColor: 'hsl(43, 62%, 45%)', transformOrigin: 'top center' }}
          >
            <div
              ref={boxRef}
              className="flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-lg border"
              style={{
                borderColor: 'hsl(43, 55%, 58%)',
                fontSize: fontPx ? `${fontPx}px` : 'clamp(0.7rem, 2.8vw, 1.2rem)',
                paddingInline: '0.5em',
                paddingBlock: '0.5em',
              }}
            >
              {showBismillah && (
                <p
                  data-bismillah
                  dir="rtl"
                  className="mb-[0.55em] w-full text-center font-amiri font-extrabold text-foreground"
                  style={{
                    fontWeight: 800,
                    fontSize: '1.05em',
                  }}
                >
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </p>
              )}

              <div
          ref={quranTextRef}
          dir="rtl"
          lang="ar"
          className="quran-text tajweed-text mx-auto w-full max-w-4xl font-extrabold text-foreground [&_span]:font-bold"
          style={{
            textAlign: 'justify',
            textAlignLast: 'justify',
            lineHeight: lineHeightVal,
            flexShrink: 0,
            fontWeight: 800,
            fontSize: '1em',
            overflowWrap: 'break-word',
          }}
        >
          {themeGroups.map((group, gi) => (
            <span
              key={`g-${gi}`}
              style={{
                display: 'inline',
                background: group.theme ? `hsl(${group.theme.hsl} / 0.18)` : undefined,
                boxDecorationBreak: 'clone',
                WebkitBoxDecorationBreak: 'clone',
              }}
            >
              {group.verses.map((v) => {
                const isCurrent = currentVerse === v.number;
                const providedTajweed = versesTajweed?.[v.number];
                const html =
                  preferProvidedTajweed && providedTajweed
                    ? sanitizeTajweedHtml(providedTajweed)
                    : sanitizeTajweedHtml(applyAutoTajweed(v.text));
                return (
                  <span
                    key={v.number}
                    data-verse={v.number}
                    onClick={() => setMenuVerse(v.number)}
                    title={
                      group.theme
                        ? `${group.theme.emoji} ${group.theme.labels.fr} · ${group.theme.labels.ar}`
                        : undefined
                    }
                    style={
                      { boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }
                    }
                    className={cn(
                      'inline transition-all cursor-pointer rounded-sm',
                      isCurrent &&
                        (isAudioPlaying
                          ? 'bg-primary/25 ring-2 ring-primary shadow-md'
                          : 'bg-primary/10 ring-1 ring-primary/40')
                    )}
                  >
                    <span dangerouslySetInnerHTML={{ __html: html }} />
                    <span className="mx-[0.2em] inline-flex items-center justify-center align-middle text-primary font-bold">
                      ۝{toArabicDigits(v.number)}
                    </span>{' '}
                  </span>
                );
              })}
            </span>
          ))}
          {pageVerses.length === 0 && (
            <p className="text-center text-muted-foreground text-base">
              Aucun verset sur cette page pour cette sourate.
            </p>
          )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barre de commandes rapides, à fleur du cadre et masquable à la demande. */}
      {showMenuButton ? (
        <div
          className="fixed left-1/2 z-[80] flex -translate-x-1/2 items-center gap-2 rounded-full border border-primary/25 bg-background/90 px-2 py-1.5 shadow-2xl backdrop-blur"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)' }}
        >
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Page suivante"
            onClick={goNext}
            className="h-10 w-10 rounded-full text-primary"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Verset précédent"
            onClick={() => onPreviousVerse?.()}
            className="h-10 w-10 rounded-full text-primary"
          >
            <SkipBack className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            size="icon"
            aria-label={isAudioPlaying ? 'Pause' : 'Lecture'}
            onClick={() => onPlayPause?.()}
            className="h-12 w-12 rounded-full shadow-lg"
          >
            {isAudioPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Verset suivant"
            onClick={() => onNextVerse?.()}
            className="h-10 w-10 rounded-full text-primary"
          >
            <SkipForward className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Page précédente"
            onClick={goPrev}
            className="h-10 w-10 rounded-full text-primary"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
            onClick={toggleFullscreen}
            className="h-10 w-10 rounded-full text-primary"
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Ouvrir les commandes"
            onClick={() => setMenuOpen(true)}
            onDoubleClick={() => setShowMenuButton(false)}
            className="h-10 w-10 rounded-full text-primary"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowMenuButton(true)}
          aria-label="Afficher le bouton des commandes"
          className="fixed bottom-0 left-1/2 z-[80] h-8 w-24 -translate-x-1/2 rounded-t-full bg-primary/15"
        >
          <span className="mx-auto block h-1 w-10 rounded-full bg-primary/60" />
        </button>
      )}

      {/* Quick access Sheet: settings, audio, recording */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" className="z-[90] max-h-[88dvh] rounded-t-2xl overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
          <SheetHeader>
            <SheetTitle>Commandes du Mushaf</SheetTitle>
            <SheetDescription>Navigation, son, répétition, voix et enregistrement.</SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            <section>
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Pages</h4>
              <div className="mb-2 text-center text-sm font-medium text-foreground">
                {surah?.name} · Page {currentPage}/604
                {currentVerse ? ` · Verset ${currentVerse}` : ''}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="default"
                  onClick={() => { goNext(); setMenuOpen(false); }}
                  disabled={currentPage >= 604}
                  className="h-12 justify-center gap-2"
                >
                  <ChevronLeft className="h-5 w-5" />
                  Page suivante
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { goPrev(); setMenuOpen(false); }}
                  disabled={currentPage <= 1}
                  className="h-12 justify-center gap-2"
                >
                  Page précédente
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </section>

            <section>
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Audio</h4>
              {audioControls ?? (
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3">
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
                  <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                    <Volume2 className="h-3.5 w-3.5" />
                    {currentVerse ? `Verset ${currentVerse}` : '—'}
                  </span>
                </div>
              )}
            </section>

            {voiceControls && (
              <section>
                <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Commande vocale</h4>
                <div className="rounded-2xl border border-border bg-card p-3">
                  {voiceControls}
                </div>
              </section>
            )}

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
              {settingsControls && <div className="mb-2">{settingsControls}</div>}
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => {
                  setMenuOpen(false);
                  toggleFullscreen();
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
