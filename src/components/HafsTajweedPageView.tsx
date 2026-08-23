import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Play, Pause, SkipBack, SkipForward, BookOpen, Sparkles, X, Menu, Mic, RotateCcw, Volume2, ListMusic, Repeat } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Verse, surahs } from '@/data/surahs';
import { juzMapping, getJuzForVerse } from '@/data/surahs';
import { sanitizeTajweedHtml } from '@/lib/sanitize';
import { applyAutoTajweed } from '@/lib/autoTajweed';
import { getThemesForVerse } from '@/data/quranThemes';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
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
  onNavigateToSurah?: (surah: number) => void;
  onNavigateToJuz?: (juz: number) => void;
  playbackSpeed?: number;
  onSpeedChange?: (speed: number) => void;
  /** Lance la lecture d'une plage de versets (verset, page, sourate ou juz). */
  onPlayRange?: (startVerse: number, endVerse: number, loop: boolean) => void;

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
  onNavigateToSurah,
  onNavigateToJuz,
  playbackSpeed = 1,
  onSpeedChange,
  onPlayRange,

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
  const [scopeOpen, setScopeOpen] = useState(false);
  const [loopScope, setLoopScope] = useState(false);
  const [activeScope, setActiveScope] = useState<'verse' | 'page' | 'surah' | 'juz'>('verse');


  const [recorderVerse, setRecorderVerse] = useState<number | null>(null);
  // Bouton d'appel du menu : masquable pour libérer toute la page.
  const [showMenuButton, setShowMenuButton] = useState(true);
  const [pageInput, setPageInput] = useState('');

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
    setCurrentPage((p) => {
      if (p < startPage) return startPage;
      if (p > endPage) return endPage;
      return p;
    });
  }, [startPage, endPage]);

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

  const currentJuz = useMemo(
    () => getJuzForVerse(surahNumber, pageVerses[0]?.number ?? 1),
    [surahNumber, pageVerses]
  );

  // Plages de lecture disponibles : verset, page, sourate, juz.
  const playScopes = useMemo(() => {
    const fallback = pageVerses[0]?.number ?? 1;
    const verse = currentVerse ?? fallback;
    const juzVerses = verses.filter((v) => getJuzForVerse(surahNumber, v.number) === currentJuz);
    const surahEnd = verses.length ? verses[verses.length - 1].number : verse;
    return {
      verse: { start: verse, end: verse, label: `Verset ${verse} — الآية`, short: `V${verse}` },
      page: {
        start: pageVerses[0]?.number ?? verse,
        end: pageVerses[pageVerses.length - 1]?.number ?? verse,
        label: `Page ${currentPage} — الصفحة`,
        short: `P${currentPage}`,
      },
      surah: {
        start: verses[0]?.number ?? 1,
        end: surahEnd,
        label: `Sourate ${surah?.name ?? surahNumber} — السورة`,
        short: `S${surahNumber}`,
      },
      juz: {
        start: juzVerses[0]?.number ?? verse,
        end: juzVerses[juzVerses.length - 1]?.number ?? verse,
        label: `Juz ${currentJuz} — الجزء`,
        short: `J${currentJuz}`,
      },
    };
  }, [pageVerses, currentVerse, verses, surahNumber, currentJuz, currentPage, surah]);

  const scopeDetailLabel = useMemo(() => {
    const scope = playScopes[activeScope];
    const start = scope.start;
    const end = scope.end;
    if (activeScope === 'verse') {
      return `Verset ${start}`;
    }
    if (activeScope === 'page') {
      return `Page ${currentPage}, V${start}–${end}`;
    }
    if (activeScope === 'surah') {
      return `Sourate ${surahNumber}, V${start}–${end}`;
    }
    return `Juz ${currentJuz}, V${start}–${end}`;
  }, [playScopes, activeScope, currentPage, surahNumber, currentJuz]);

  const startScope = useCallback(
    (key: keyof typeof playScopes) => {
      const scope = playScopes[key];
      setActiveScope(key as 'verse' | 'page' | 'surah' | 'juz');
      setScopeOpen(false);
      onPlayRange?.(scope.start, scope.end, loopScope);
    },
    [playScopes, loopScope, onPlayRange]
  );




  // Regroupe les versets consécutifs partageant le MÊME thème dominant unique
  // (Tafsir Mawdou'i). Un seul thème par bloc => une seule couleur, pas de
  // dégradé : le coloriage reste lisible et cohérent dans toutes les sourates.
  const themeGroups = useMemo(() => {
    const groups: {
      theme: ReturnType<typeof getPrimaryThemeForVerse>['theme'];
      curated: boolean;
      key: string;
      verses: typeof pageVerses;
    }[] = [];
    for (const v of pageVerses) {
      const { theme, curated } = getPrimaryThemeForVerse(surahNumber, v.number);
      const key = `${theme?.id ?? 'none'}:${curated ? 'c' : 'd'}`;
      const last = groups[groups.length - 1];
      if (last && last.key === key) {
        last.verses.push(v);
      } else {
        groups.push({ theme, curated, key, verses: [v] });
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

  // Swipe right (left-to-right) advances to the next page, swipe left goes back.
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
    if (dx > 0) goNext();
    else goPrev();
  };

  const showBismillah = currentPage === startPage && surahNumber !== 1 && surahNumber !== 9;

  // ---- Remplissage vertical de la page --------------------------------
  // Recherche binaire déterministe : on cherche la plus grande échelle de
  // police qui tient dans le cadre, puis on étire l'interligne pour combler
  // l'espace restant. Aucun débordement possible, rendu régulier.
  const frameRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(1.95);
  const [fontPx, setFontPx] = useState(0); // 0 = pas encore mesuré

  const MIN_LH = 1.4;
  const MAX_LH = 2.6;
  const MIN_PX = 14;
  const MAX_PX = 64;
  const BASE_LH = 1.9;
  const sigRef = useRef('');

  useLayoutEffect(() => {
    sigRef.current = '';
  }, [currentPage, surahNumber]);

  useLayoutEffect(() => {
    const measure = (force = false) => {
      const frameEl = frameRef.current;
      const textEl = textRef.current;
      if (!frameEl || !textEl) return;
      const content = (textEl.textContent || '').trim();
      if (content.length < 5) return;

      const available = frameEl.clientHeight - 8;
      if (available <= 0) return;
      const bismillah = frameEl.querySelector('[data-bismillah]') as HTMLElement | null;
      const extra = bismillah ? bismillah.offsetHeight + 8 : 0;
      const target = available - extra;
      if (target <= 0) return;

      // Ne recalculer que si le contenu ou les dimensions ont changé.
      const sig = `${content.length}|${textEl.clientWidth}|${target}`;
      if (!force && sig === sigRef.current) return;
      sigRef.current = sig;

      const prevLh = textEl.style.lineHeight;
      const prevFs = textEl.style.fontSize;
      // Les transitions CSS faussent les mesures : on les gèle le temps du calcul.
      textEl.classList.add('fit-measuring');

      // Tailles en pixels (mesure synchrone fiable, pas d'unités de conteneur).
      const heightAt = (px: number, lh: number) => {
        textEl.style.fontSize = `${px}px`;
        textEl.style.lineHeight = String(lh);
        return textEl.scrollHeight;
      };

      // 1) Plus grande taille de police qui tient dans le cadre.
      let lo = MIN_PX;
      let hi = MAX_PX;
      if (heightAt(MAX_PX, BASE_LH) <= target) {
        lo = MAX_PX;
      } else {
        for (let i = 0; i < 12; i++) {
          const mid = (lo + hi) / 2;
          if (heightAt(mid, BASE_LH) <= target) lo = mid;
          else hi = mid;
        }
      }
      const px = Math.floor(lo * 10) / 10;

      // 2) Étirer l'interligne pour combler le vide restant, sans déborder.
      let lhLo = MIN_LH;
      let lhHi = MAX_LH;
      if (heightAt(px, MAX_LH) <= target) {
        lhLo = MAX_LH;
      } else {
        for (let i = 0; i < 12; i++) {
          const mid = (lhLo + lhHi) / 2;
          if (heightAt(px, mid) <= target) lhLo = mid;
          else lhHi = mid;
        }
      }
      const lh = Number(lhLo.toFixed(3));

      textEl.style.fontSize = prevFs;
      textEl.style.lineHeight = prevLh;
      textEl.classList.remove('fit-measuring');

      setFontPx((cur) => (Math.abs(cur - px) < 0.2 ? cur : px));
      setLineHeight((cur) => (Math.abs(cur - lh) < 0.01 ? cur : lh));
    };

    let raf = 0;
    const schedule = (force = false) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => measure(force));
    };

    schedule(true);
    // Le contenu (versets, tajweed) et les polices arrivent de façon asynchrone :
    // on surveille en continu la signature du contenu, sans recalcul inutile.
    const poll = window.setInterval(() => schedule(false), 250);
    (document as any).fonts?.ready?.then?.(() => schedule(true));

    const frameEl = frameRef.current;
    const ro = frameEl ? new ResizeObserver(() => schedule(true)) : null;
    if (frameEl && ro) ro.observe(frameEl);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(poll);
      ro?.disconnect();
    };
  }, []);




  return (
    <div
      ref={rootRef}
      className={cn(
        'fixed inset-0 z-[70] h-[100dvh] w-screen bg-background overflow-hidden',
        isFullscreen && 'z-[75]'
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
          backgroundColor: 'hsl(195, 80%, 96%)',
          paddingInline: 'calc(env(safe-area-inset-left, 0px) + clamp(0.5rem, 3vw, 1.5rem))',
        }}
      >
        {/* Cadre de page façon Mushaf : bordure double, contenu centré */}
        <div
          className="mx-auto h-full w-full max-w-3xl overflow-hidden [container-type:inline-size]"
        >
          <div
            className="relative flex h-full w-full flex-col rounded-xl border-[3px] p-1 shadow-lg sm:p-1.5"
            style={{
              borderColor: 'hsl(43, 62%, 45%)',
              transformOrigin: 'top center',
              background: 'linear-gradient(135deg, hsl(43, 62%, 45% / 0.06) 0%, transparent 40%, transparent 60%, hsl(43, 62%, 45% / 0.06) 100%)',
            }}
          >
            {/* Ornements aux quatre coins du cadre */}
            <span aria-hidden className="pointer-events-none absolute -top-1.5 -left-1.5 h-6 w-6 rounded-full border-2 bg-background" style={{ borderColor: 'hsl(43, 62%, 45%)' }} />
            <span aria-hidden className="pointer-events-none absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full border-2 bg-background" style={{ borderColor: 'hsl(43, 62%, 45%)' }} />
            <span aria-hidden className="pointer-events-none absolute -bottom-1.5 -left-1.5 h-6 w-6 rounded-full border-2 bg-background" style={{ borderColor: 'hsl(43, 62%, 45%)' }} />
            <span aria-hidden className="pointer-events-none absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-full border-2 bg-background" style={{ borderColor: 'hsl(43, 62%, 45%)' }} />

            {/* En-tête façon Mushaf : sourate (droite) et Juz (gauche), cliquables */}
            <div
              dir="rtl"
              className="mb-1 flex shrink-0 items-center justify-between gap-2 rounded-lg border px-2 py-1"
              style={{
                borderColor: 'hsl(43, 55%, 58%)',
                backgroundColor: 'hsl(43, 62%, 45% / 0.08)',
              }}
            >
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="max-w-[46%] truncate rounded-md px-2 py-0.5 font-amiri text-base font-bold sm:text-lg"
                style={{ color: 'hsl(43, 62%, 25%)' }}
                aria-label="Choisir une sourate"
              >
                سورة {surah?.nameArabic ?? ''}
              </button>
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="max-w-[46%] truncate rounded-md px-2 py-0.5 font-amiri text-base font-bold sm:text-lg"
                style={{ color: 'hsl(43, 62%, 25%)' }}
                aria-label="Choisir un Juz"
              >
                الجزء {toArabicDigits(currentJuz)}
              </button>
            </div>

            {/* Numéro de page façon Mushaf, centré en haut du cadre */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Choisir une page"
              className="mx-auto mb-1.5 mt-0.5 w-fit rounded-full border-2 px-4 py-1 text-base font-bold shadow-sm"
              style={{
                backgroundColor: 'hsl(195, 80%, 96%)',
                borderColor: 'hsl(43, 62%, 45%)',
                color: 'hsl(43, 62%, 25%)',
              }}
            >
              {toArabicDigits(currentPage)} · Page {currentPage} / 604
            </button>
            <div
              ref={frameRef}
              className="flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden rounded-lg border-2"
              style={{
                borderColor: 'hsl(43, 55%, 58%)',
                paddingInline: '0.35em',
                paddingBlock: '0.4em',
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
          ref={textRef}
          dir="rtl"
          lang="ar"
          className="quran-text tajweed-text mx-auto w-full max-w-3xl font-extrabold text-foreground [&_span]:font-bold"
          style={{
            fontSize: fontPx ? `${fontPx}px` : 'clamp(18px, 6vw, 34px)',
            textAlign: 'justify',
            textAlignLast: 'center',
            wordSpacing: '-0.14em',
            
            lineHeight,
            flexShrink: 0,
            fontWeight: 800,
            overflowWrap: 'break-word',
          }}

        >
          {themeGroups.map((group, gi) => {
            const primary = group.themes[0] ?? null;
            const secondary = group.themes[1] ?? null;
            const themeTitle = group.themes.length
              ? group.themes.map((t) => `${t.emoji} ${t.labels.fr} · ${t.labels.ar}`).join(' | ')
              : undefined;
            return (
            <span
              key={`g-${gi}`}
              style={{
                display: 'inline',
                // Same primary/secondary logic as the verse view (Tafsir Mawdou'i)
                background: primary
                  ? secondary
                    ? `linear-gradient(135deg, hsl(${primary.hsl} / 0.18) 0%, hsl(${secondary.hsl} / 0.18) 100%)`
                    : `hsl(${primary.hsl} / 0.18)`
                  : undefined,
                boxDecorationBreak: 'clone',
                WebkitBoxDecorationBreak: 'clone',
              }}
            >
              {group.verses.map((v) => {
                const isCurrent = currentVerse === v.number;
                const providedTajweed = versesTajweed?.[v.number];
                // Warsh / Qalun : le texte de la qirâa est fourni en texte brut.
                // On lui applique alors les couleurs Tajweed automatiques pour
                // obtenir le même rendu coloré que Hafs, sans perdre la variante.
                const source =
                  preferProvidedTajweed && providedTajweed ? providedTajweed : v.text;
                const alreadyColoured = /<span[\s>]/i.test(source);
                const html = alreadyColoured
                  ? sanitizeTajweedHtml(source)
                  : sanitizeTajweedHtml(applyAutoTajweed(source));
                return (
                  <span
                    key={v.number}
                    data-verse={v.number}
                    onClick={() => setMenuVerse(v.number)}
                    title={themeTitle}
                    style={
                      { boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }
                    }
                    className={cn(
                      'inline transition-colors cursor-pointer rounded-sm',
                      isCurrent &&
                        (isAudioPlaying
                          ? 'bg-primary/40 ring-4 ring-primary shadow-lg shadow-primary/40 animate-pulse'
                          : 'bg-primary/20 ring-2 ring-primary/60')
                    )}
                  >
                    <span dangerouslySetInnerHTML={{ __html: html }} />
                    <span className="mx-[0.02em] inline-flex items-center justify-center align-middle text-primary font-bold">
                      ۝{toArabicDigits(v.number)}
                    </span>{' '}
                  </span>
                );
              })}
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
          </div>
        </div>
      </div>

      {/* Barre de commandes rapides, à fleur du cadre et masquable à la demande. */}
      {showMenuButton ? (
        <div
          className="fixed left-1/2 z-[80] flex max-w-[96vw] -translate-x-1/2 flex-nowrap items-center justify-center gap-0.5 overflow-x-auto rounded-full border border-primary/25 bg-background/90 px-1.5 py-1.5 shadow-2xl backdrop-blur"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)' }}
        >
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Page suivante"
            onClick={goNext}
            className="h-9 w-9 shrink-0 rounded-full text-primary"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Verset précédent"
            onClick={() => onPreviousVerse?.()}
            className="h-9 w-9 shrink-0 rounded-full text-primary"
          >
            <SkipBack className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            size="icon"
            aria-label={isAudioPlaying ? 'Pause' : 'Lecture'}
            onClick={() => onPlayPause?.()}
            className="h-11 w-11 shrink-0 rounded-full shadow-lg"
          >
            {isAudioPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </Button>
          {onPlayRange && (
            <button
              type="button"
              aria-label={`Plage de lecture : ${playScopes[activeScope].label}`}
              title="Appui : lancer la plage · Double-appui : plus d'options"
              onClick={() => startScope(activeScope)}
              onDoubleClick={() => setScopeOpen(true)}
              className="flex h-9 shrink-0 flex-col items-center justify-center rounded-full border border-primary/40 bg-background px-2.5 text-primary"
            >
              <span className="flex items-center gap-1 text-[10px] font-bold leading-none">
                <ListMusic className="h-3 w-3" />
                {{ verse: 'Verset', page: 'Page', surah: 'Sourate', juz: 'Juz' }[activeScope]}
              </span>
              <span className="mt-0.5 text-[9px] leading-none text-muted-foreground">
                {scopeDetailLabel}
              </span>
            </button>
          )}
          {onPlayRange && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Changer la plage de lecture"
              onClick={() =>
                setActiveScope((s) =>
                  s === 'verse' ? 'page' : s === 'page' ? 'surah' : s === 'surah' ? 'juz' : 'verse'
                )
              }
              className="h-9 w-8 shrink-0 rounded-full text-primary"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          {onSpeedChange && (
            <Button
              type="button"
              variant="outline"
              aria-label={`Vitesse de lecture : ${playbackSpeed}x`}
              onClick={() => {
                const steps = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
                const i = steps.indexOf(playbackSpeed);
                onSpeedChange(steps[(i === -1 ? 2 : i + 1) % steps.length]);
              }}
              className="h-9 shrink-0 rounded-full border-primary/40 px-2 text-xs font-bold text-primary"
            >
              {playbackSpeed}x
            </Button>
          )}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Verset suivant"
            onClick={() => onNextVerse?.()}
            className="h-9 w-9 shrink-0 rounded-full text-primary"
          >
            <SkipForward className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Page précédente"
            onClick={goPrev}
            className="h-9 w-9 shrink-0 rounded-full text-primary"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
            onClick={toggleFullscreen}
            className="h-9 w-9 shrink-0 rounded-full text-primary"
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
            className="h-9 w-9 shrink-0 rounded-full text-primary"
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
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Navigation — الانتقال
              </h4>
              <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Sourate — السورة</label>
                  <Select
                    value={String(surahNumber)}
                    onValueChange={(v) => {
                      setMenuOpen(false);
                      onNavigateToSurah?.(Number(v));
                    }}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Choisir une sourate" />
                    </SelectTrigger>
                    <SelectContent className="z-[120] max-h-72">
                      {surahs.map((s) => (
                        <SelectItem key={s.number} value={String(s.number)}>
                          {s.number}. {s.name} — {s.nameArabic}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Page (1-604) — الصفحة</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={604}
                      inputMode="numeric"
                      value={pageInput}
                      onChange={(e) => setPageInput(e.target.value)}
                      placeholder={String(currentPage)}
                      className="h-11"
                    />
                    <Button
                      className="h-11"
                      onClick={() => {
                        const p = parseInt(pageInput, 10);
                        if (p >= 1 && p <= 604) {
                          setPageInput('');
                          setMenuOpen(false);
                          goToPage(p);
                        }
                      }}
                    >
                      Aller
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Juz (1-30) — الجزء</label>
                  <Select
                    value=""
                    onValueChange={(v) => {
                      setMenuOpen(false);
                      onNavigateToJuz?.(Number(v));
                    }}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Choisir un Juz" />
                    </SelectTrigger>
                    <SelectContent className="z-[120] max-h-72">
                      {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
                        <SelectItem key={j} value={String(j)}>
                          Juz {j} — {juzMapping[j]?.name ?? ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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

      {/* Choix de la portée de lecture : verset, page, sourate, juz */}
      <Dialog open={scopeOpen} onOpenChange={setScopeOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Choix de la lecture — اختيار القراءة</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {(['verse', 'page', 'surah', 'juz'] as const).map((key) => {
              const scope = playScopes[key];
              return (
                <Button
                  key={key}
                  variant="outline"
                  className="h-12 w-full justify-between text-sm"
                  onClick={() => startScope(key)}
                >
                  <span className="flex items-center gap-2">
                    <Play className="h-4 w-4 text-primary" />
                    {scope.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {scope.start === scope.end ? `v. ${scope.start}` : `v. ${scope.start}–${scope.end}`}
                  </span>
                </Button>
              );
            })}
            <Button
              variant={loopScope ? 'default' : 'ghost'}
              className="h-11 w-full justify-center gap-2 text-sm"
              onClick={() => setLoopScope((v) => !v)}
            >
              <Repeat className="h-4 w-4" />
              Répéter en boucle {loopScope ? '(activé)' : '(désactivé)'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
