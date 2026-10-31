import { hafsDisplayText } from '@/lib/hafsDisplay';
import { useT } from '@/lib/i18n';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Play, Pause, SkipBack, SkipForward, BookOpen, FileText, Sparkles, X, Menu, Mic, RotateCcw, Volume2, ListMusic, Repeat, Home, Headphones, Search } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { MushafPageBadge } from '@/components/MushafPageBadge';
import { Verse, surahs } from '@/data/surahs';
import { juzMapping, getJuzForVerse, surahPageStart } from '@/data/surahs';

// Clés "sourate:verset" des versets où commence un Juz (pour la marque ۞).
const juzStartKeys = new Set(
  Object.values(juzMapping).map((s) => `${s.surah}:${s.verse}`)
);
import { sanitizeTajweedHtml } from '@/lib/sanitize';
import { applyAutoTajweed } from '@/lib/autoTajweed';
import { splitHtmlIntoWords, wordIndexForProgress } from '@/lib/tajweedWordSync';
import { getThemesForVerse, getPrimaryThemeForVerse, getThemeById } from '@/data/quranThemes';
import { surahHasHeaderBasmala } from '@/lib/basmala';
import type { FullPageGroup } from '@/hooks/useFullMushafPage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ThematicTafsirPanel } from './ThematicTafsirPanel';
import { MushafVerseStudy } from './MushafVerseStudy';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useFullscreen } from '@/hooks/useFullscreen';
import { VerseRecorder } from './VerseRecorder';
import { useHafsMedinaWordLines, type MedinaLineWord } from '@/hooks/useHafsMedinaWordLines';
import { useHafsVerseThemes } from '@/hooks/useHafsVerseThemes';
import { getThematicParagraph } from '@/lib/thematicParagraph';
import { getMushafOpeningRows } from '@/lib/mushafOpeningLayout';

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
  /** Police officielle correspondant à la riwaya affichée. */
  riwaya?: 'hafs' | 'warsh' | 'qalun';
  /** Contenu complet de la page (toutes les sourates), façon Mushaf imprimé. */
  fullPageGroups?: FullPageGroup[] | null;
  initialPage?: number;
  onPageChange?: (page: number) => void;
  currentVerse?: number;
  isAudioPlaying?: boolean;
  /** Progression (0-100) de l'audio du verset en cours, pour le suivi des mots. */
  verseProgress?: number;
  /** Surlignage/soulignement du verset récité (menu « التلاوة الصوتية »). */
  highlightCurrentVerse?: boolean;
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
  /** Ouvre le menu audio depuis la barre de commandes du bas. */
  onOpenAudioMenu?: () => void;
  /** Lance la lecture d'une plage de versets (verset, page, sourate ou juz). repeatCount: 0 = infini. */
  onPlayRange?: (startVerse: number, endVerse: number, loop: boolean, repeatCount?: number) => void;

  audioControls?: ReactNode;
  voiceControls?: ReactNode;
  settingsControls?: ReactNode;
  onSwitchToVerses?: () => void;
  /** Affichage en double page : moitié de l'écran occupée par cette page. */
  spreadSide?: 'left' | 'right';
  /** Page compagne (lecture seule) : aucune barre de commandes. */
  isCompanion?: boolean;
  twoPageMode?: boolean;
  onToggleTwoPage?: () => void;
}

// Convert a Western digit to Arabic-Indic digits (٠-٩) for the verse marker.
const toArabicDigits = (n: number) =>
  String(n);

// Centres verticaux des fragments de texte réels (et non des aplats
// thématiques, dont le rembourrage faussait le compte des lignes).
function collectTextCenters(root: HTMLElement): number[] {
  const out: number[] = [];
  root.querySelectorAll<HTMLElement>('[data-mushaf-verse-row]').forEach((row) => {
    const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = walker.nextNode())) {
      if (!n.textContent?.trim()) continue;
      const r = document.createRange();
      r.selectNodeContents(n);
      Array.from(r.getClientRects()).forEach((rect) => {
        if (rect.width > 1 && rect.height > 1) out.push(rect.top + rect.height / 2);
      });
    }
  });
  return out;
}

export const HafsTajweedPageView = ({
  surahNumber,
  verses,
  versesTajweed,
  preferProvidedTajweed = false,
  riwaya = 'hafs',
  fullPageGroups = null,
  initialPage,
  onPageChange,
  currentVerse,
  isAudioPlaying,
  verseProgress = 0,
  highlightCurrentVerse = true,
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
  onOpenAudioMenu,
  onPlayRange,

  audioControls,
  voiceControls,
  settingsControls,
  onSwitchToVerses,
  spreadSide,
  isCompanion = false,
  twoPageMode = false,
  onToggleTwoPage,
}: HafsTajweedPageViewProps) => {
  const t = useT();
  const lang = t.lang;
  const surah = surahs.find((s) => s.number === surahNumber);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(rootRef);

  const [menuVerse, setMenuVerse] = useState<number | null>(null);
  // Sourate du verset touché (une page peut contenir plusieurs sourates).
  const [menuSurah, setMenuSurah] = useState<number>(surahNumber);
  const [themeVerse, setThemeVerse] = useState<number | null>(null);
  const [detailVerse, setDetailVerse] = useState<number | null>(null);
  const [detailMode, setDetailMode] = useState<'verse' | 'page'>('verse');
  const { reciter } = useAppSettings();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [repeatCount, setRepeatCount] = useState(1); // 0 = boucle infinie
  const [activeScope, setActiveScope] = useState<'verse' | 'page' | 'surah' | 'juz'>('verse');


  const [recorderVerse, setRecorderVerse] = useState<number | null>(null);
  // Bouton d'appel du menu : masquable pour libérer toute la page.
  const [showMenuButton, setShowMenuButton] = useState(true);
  const [pageInput, setPageInput] = useState('');
  const [verseInput, setVerseInput] = useState('');
  // Sourate choisie dans la liste, en attente de validation par « Aller ».
  const [pendingSurah, setPendingSurah] = useState<number | null>(null);
  useEffect(() => setPendingSurah(null), [surahNumber]);
  // Recherche dans la liste des sourates (nom français, arabe ou numéro).
  const [surahQuery, setSurahQuery] = useState('');
  const surahQueryTrim = surahQuery.trim();
  const surahQueryLower = surahQueryTrim.toLowerCase();
  const filteredSurahOptions = surahQueryTrim
    ? surahs.filter((s) =>
        s.name.toLowerCase().includes(surahQueryLower) ||
        s.nameArabic.includes(surahQueryTrim) ||
        String(s.number) === surahQueryTrim
      )
    : surahs;

  // Réglages de lisibilité, persistés : échelle de la police (%) et
  // opacité des fonds thématiques (0 à 0.4).
  const [fontScalePct, setFontScalePct] = useState<number>(() => {
    const raw = Number(localStorage.getItem('mushaf-font-scale'));
    return Number.isFinite(raw) && raw >= 60 && raw <= 160 ? raw : 100;
  });
  const [themeOpacityPct, setThemeOpacityPct] = useState<number>(() => {
    const stored = localStorage.getItem('mushaf-theme-opacity');
    if (stored === null) return 32;
    const raw = Number(stored);
    return Number.isFinite(raw) && raw >= 0 && raw <= 40 ? raw : 32;
  });
  const [lineSpacingPct, setLineSpacingPct] = useState<number>(() => {
    const raw = Number(localStorage.getItem('mushaf-line-spacing'));
    return Number.isFinite(raw) && raw >= 80 && raw <= 150 ? raw : 100;
  });
  const fontScale = fontScalePct / 100;
  const themeOpacity = themeOpacityPct / 100;
  // Voile thématique plus soutenu : aplats nets et identifiables, tout en
  // laissant les couleurs du Tajweed rester lisibles.
  const thematicPaperOpacity = Math.min(0.7, 0.42 + themeOpacity * 0.6);
  const lineSpacing = lineSpacingPct / 100;
  useEffect(() => {
    localStorage.setItem('mushaf-font-scale', String(fontScalePct));
  }, [fontScalePct]);
  useEffect(() => {
    localStorage.setItem('mushaf-theme-opacity', String(themeOpacityPct));
  }, [themeOpacityPct]);
  useEffect(() => {
    localStorage.setItem('mushaf-line-spacing', String(lineSpacingPct));
  }, [lineSpacingPct]);

  const { startPage, endPage } = useMemo(() => {
    if (verses.length === 0) {
      // Pendant le chargement, afficher directement la page de la sourate demandée
      // (et non la page 1 d'Al-Fatiha).
      const p = surahPageStart[surahNumber] ?? 1;
      return { startPage: p, endPage: p };
    }
    const pages = verses.map((v) => v.page ?? 1);
    return { startPage: Math.min(...pages), endPage: Math.max(...pages) };
  }, [verses]);

  const [currentPage, setCurrentPage] = useState<number>(
    initialPage && initialPage >= startPage && initialPage <= endPage
      ? initialPage
      : startPage
  );
  const officialMedinaLines = useHafsMedinaWordLines(currentPage, riwaya === 'hafs');
  // Les thèmes sont indexés par référence sourate:verset et sont donc partagés
  // par les trois riwayat ; seule la graphie Tajweed varie.
  const verseThemes = useHafsVerseThemes(true);
  const detailParagraph = useMemo(
    () => detailVerse === null ? undefined : getThematicParagraph(verseThemes, menuSurah, detailVerse),
    [detailVerse, menuSurah, verseThemes]
  );
  const themeParagraph = useMemo(
    () => themeVerse === null ? undefined : getThematicParagraph(verseThemes, menuSurah, themeVerse),
    [menuSurah, themeVerse, verseThemes]
  );
  const usesOfficialMedinaLines = riwaya === 'hafs' && officialMedinaLines !== null;
  const officialRows = useMemo(() => officialMedinaLines ? getMushafOpeningRows(officialMedinaLines) : [], [officialMedinaLines]);
  const [officialFontPx, setOfficialFontPx] = useState(24);

  const prevSurahRef = useRef(surahNumber);
  const appliedInitialPageRef = useRef<number | null>(null);
  const manualNavRef = useRef(
    !!(initialPage && initialPage >= startPage && initialPage <= endPage)
  );

  // Reset page on surah change
  useEffect(() => {
    if (prevSurahRef.current !== surahNumber) {
      prevSurahRef.current = surahNumber;
      appliedInitialPageRef.current = null;
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
      initialPage !== appliedInitialPageRef.current
    ) {
      // A Juz can start in the same sourate as the currently displayed Juz
      // (for example Juz 1, 2 and 3 in Al-Baqara). In that case the component
      // stays mounted, so explicitly follow the changed page query parameter.
      appliedInitialPageRef.current = initialPage;
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

  // En double page, on avance d'une paire (page impaire à droite, paire à gauche).
  const goPrev = useCallback(() => {
    if (!spreadSide) return goToPage(currentPage - 1);
    const spreadStart = currentPage % 2 === 1 ? currentPage : currentPage - 1;
    goToPage(Math.max(1, spreadStart - 2));
  }, [currentPage, goToPage, spreadSide]);
  const goNext = useCallback(() => {
    if (!spreadSide) return goToPage(currentPage + 1);
    const spreadStart = currentPage % 2 === 1 ? currentPage : currentPage - 1;
    goToPage(Math.min(604, spreadStart + 2));
  }, [currentPage, goToPage, spreadSide]);

  // Navigation directe vers un numéro de verset de la sourate courante :
  // on ouvre la page du Mushaf qui contient ce verset.
  const goToVerse = useCallback(
    (n: number) => {
      const target = verses.find((v) => v.number === n);
      if (!target) return;
      const p = target.page ?? currentPage;
      if (p !== currentPage) goToPage(p);
    },
    [verses, currentPage, goToPage]
  );

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
      verse: { start: verse, end: verse, label: `${t('verse')} ${verse}`, short: `V${verse}` },
      page: {
        start: pageVerses[0]?.number ?? verse,
        end: pageVerses[pageVerses.length - 1]?.number ?? verse,
        label: `${t('page')} ${currentPage}`,
        short: `P${currentPage}`,
      },
      surah: {
        start: verses[0]?.number ?? 1,
        end: surahEnd,
        label: `${t('surah')} ${t.lang === 'ar' ? surah?.nameArabic : surah?.name}`,
        short: `S${surahNumber}`,
      },
      juz: {
        start: juzVerses[0]?.number ?? verse,
        end: juzVerses[juzVerses.length - 1]?.number ?? verse,
        label: `${t('juz')} ${currentJuz}`,
        short: `J${currentJuz}`,
      },
    };
  }, [pageVerses, currentVerse, verses, surahNumber, currentJuz, currentPage, surah, lang]);

  const scopeDetailLabel = useMemo(() => {
    const scope = playScopes[activeScope];
    const start = scope.start;
    const end = scope.end;
    if (activeScope === 'verse') {
      return `${t('verse')} ${start}`;
    }
    if (activeScope === 'page') {
      return `${t('page')} ${currentPage}, ${start}–${end}`;
    }
    if (activeScope === 'surah') {
      return `${t('surah')} ${surahNumber}, ${start}–${end}`;
    }
    return `${t('juz')} ${currentJuz}, ${start}–${end}`;
  }, [playScopes, activeScope, currentPage, surahNumber, currentJuz, lang]);

  const startScope = useCallback(
    (key: keyof typeof playScopes) => {
      const scope = playScopes[key];
      setActiveScope(key as 'verse' | 'page' | 'surah' | 'juz');
      setScopeOpen(false);
      onPlayRange?.(scope.start, scope.end, repeatCount === 0, repeatCount);
    },
    [playScopes, repeatCount, onPlayRange]
  );




  // Regroupe les versets consécutifs (d'une même sourate) partageant le MÊME
  // thème dominant unique (Tafsir Mawdou'i). Un seul thème par bloc => une
  // seule couleur, pas de dégradé : lisible et cohérent dans toutes les sourates.
  const groupByTheme = useCallback((
    sNo: number,
    list: { number: number; html: string }[]
  ) => {
    const groups: {
      theme: ReturnType<typeof getPrimaryThemeForVerse>['theme'];
      curated: boolean;
      key: string;
      verses: { number: number; html: string }[];
    }[] = [];
    for (const v of list) {
      const indexedThemeId = verseThemes?.[`${sNo}:${v.number}`];
      const indexedTheme = indexedThemeId ? getThemeById(indexedThemeId) : undefined;
      const fallback = getPrimaryThemeForVerse(sNo, v.number);
      const theme = indexedTheme ?? fallback.theme;
      const curated = indexedTheme !== undefined || fallback.curated;
      const key = theme?.id ?? 'none';
      const last = groups[groups.length - 1];
      if (last && last.key === key) {
        last.verses.push(v);
      } else {
        groups.push({ theme, curated, key, verses: [v] });
      }
    }
    return groups;
  }, [verseThemes]);


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

  // ——— Synchronisation Tajweed / récitation ———
  // Le texte coloré du verset en cours est découpé en mots (les couleurs des
  // règles restent intactes) et le mot récité est souligné en suivant la
  // progression de l'audio, pondérée par la longueur de chaque mot.
  const buildVerseHtml = useCallback(
    (v: Verse) => {
      const provided = versesTajweed?.[v.number];
      const source = preferProvidedTajweed && provided ? provided : v.text;
      const alreadyColoured = /<span[\s>]/i.test(source);
      return alreadyColoured
        ? sanitizeTajweedHtml(source)
        : sanitizeTajweedHtml(applyAutoTajweed(source));
    },
    [preferProvidedTajweed, versesTajweed]
  );

  // Page complète façon Mushaf imprimé : toutes les sourates présentes sur la
  // page (fin de la sourate précédente, début de la suivante), chacune avec
  // ses blocs thématiques. Repli sur la sourate courante si l'index n'est pas prêt.
  const pageSections = useMemo(() => {
    if (fullPageGroups && fullPageGroups.length > 0) {
      return fullPageGroups.map((g) => ({
        surahNumber: g.surahNumber,
        startsHere: g.startsHere,
        groups: groupByTheme(g.surahNumber, g.verses),
      }));
    }
    return [
      {
        surahNumber,
        startsHere: false,
        groups: groupByTheme(
          surahNumber,
          pageVerses.map((v) => ({ number: v.number, html: buildVerseHtml(v) }))
        ),
      },
    ];
  }, [fullPageGroups, pageVerses, surahNumber, buildVerseHtml, groupByTheme]);

  const currentWords = useMemo(() => {
    if (!currentVerse) return null;
    const section = pageSections.find((s) => s.surahNumber === surahNumber);
    const v = section?.groups.flatMap((g) => g.verses).find((x) => x.number === currentVerse);
    if (!v) return null;
    return splitHtmlIntoWords(v.html);
  }, [currentVerse, pageSections, surahNumber]);

  const activeWordIndex = useMemo(
    () => (currentWords ? wordIndexForProgress(currentWords.weights, verseProgress) : -1),
    [currentWords, verseProgress]
  );

  // Surbrillance claire de tout le verset récité (plus de soulignement mot à mot).
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    root.querySelectorAll('.verse-reciting').forEach((n) => n.classList.remove('verse-reciting'));
    if (!currentVerse || !highlightCurrentVerse || !isAudioPlaying) return;
    root.querySelectorAll<HTMLElement>(`[data-verse="${currentVerse}"]`).forEach((n) => {
      n.classList.add('verse-reciting');
    });
  }, [activeWordIndex, currentVerse, currentWords, isAudioPlaying, currentPage, highlightCurrentVerse]);


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

  // Avec la page complète, la Basmala est affichée dans l'en-tête de sourate.
  const showBismillah =
    !fullPageGroups?.length && currentPage === startPage && surahNumber !== 1 && surahNumber !== 9;

  // ---- Mise en page Médine à quinze lignes -----------------------------
  // Le navigateur ne coupe pas l'arabe aux mêmes endroits sur tous les
  // téléphones. On compte donc les lignes réellement peintes, puis on ajuste
  // la police jusqu'à obtenir quinze lignes de versets (sept pour la Fatiha).
  const frameRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(1.95);
  const [fontPx, setFontPx] = useState(0); // 0 = pas encore mesuré

  // L'interlignage choisi par l'utilisateur déplace les bornes : plus il est
  // large, plus la police se réduit pour que la page reste pleine et lisible.
  const MIN_LH = 1.4 * lineSpacing;
  const MIN_PX = 14;
  const MAX_PX = 64;
  const sigRef = useRef('');
  const lastTargetRef = useRef(0);
  const measuredRef = useRef(false);

  useLayoutEffect(() => {
    sigRef.current = '';
    lastTargetRef.current = 0;
    measuredRef.current = false;
  }, [currentPage, surahNumber, riwaya, fontScalePct, lineSpacingPct]);

  useLayoutEffect(() => {
    const measure = (force = false) => {
      if (usesOfficialMedinaLines) return;
      const frameEl = frameRef.current;
      const textEl = textRef.current;
      if (!frameEl || !textEl) return;
      const content = (textEl.textContent || '').trim();
      if (content.length < 5) return;

      const frameStyle = window.getComputedStyle(frameEl);
      const framePad =
        parseFloat(frameStyle.paddingTop || '0') + parseFloat(frameStyle.paddingBottom || '0');
      const available = frameEl.clientHeight - framePad - 8;
      if (available <= 0) return;
      const bismillah = frameEl.querySelector('[data-bismillah]') as HTMLElement | null;
      const extra = bismillah ? bismillah.offsetHeight + 8 : 0;
      // Petite marge de sécurité : la justification complète des lignes peut
      // faire varier la hauteur d'un ou deux pixels après application.
      // Réserver la hauteur des bordures et des diacritiques qui dépassent
      // légèrement la boîte typographique sur Android.
      const target = available - extra - 22;
      if (target <= 0) return;

      // Ne recalculer que si le contenu ou la largeur changent réellement.
      // La hauteur du cadre varie de quelques pixels sur mobile (barre
      // d'adresse qui se masque) : on ignore ces micro-variations, sinon la
      // page « tremble » en permanence.
      // La lecture fait partie de la signature : Hafs, Warsh et Qaloun ont
      // chacun leur propre métrique de fonte, même à contenu égal.
      const sig = `${riwaya}|${content.length}|${Math.round(textEl.clientWidth)}`;
      const targetChanged = Math.abs(target - lastTargetRef.current) > 28;
      const overflow = frameEl.scrollHeight - frameEl.clientHeight;
      const overflowing = overflow > 2;
      // Tant que la page n'affiche pas ses 15 lignes, on recalcule (police
      // chargée tardivement sur Android, texte Warsh/Qaloun arrivé après).
      const countNow = () => {
        const t: number[] = [];
        collectTextCenters(textEl).forEach((c) => t.push(c));
        t.sort((a, b) => a - b);
        const tol = Math.max(6, (parseFloat(getComputedStyle(textEl).fontSize) || 20) * 0.6);
        const u: number[] = [];
        t.forEach((v) => { if (!u.some((x) => Math.abs(v - x) <= tol)) u.push(v); });
        return u.length;
      };
      const wantLines = currentPage === 1 ? 7 : 15;
      const linesOk = countNow() >= wantLines - 1;
      if (measuredRef.current && sig === sigRef.current && !targetChanged && !overflowing && linesOk) return;
      sigRef.current = sig;
      lastTargetRef.current = target;

      const prevLh = textEl.style.lineHeight;
      const prevFs = textEl.style.fontSize;
      // Les transitions CSS faussent les mesures : on les gèle le temps du calcul.
      textEl.classList.add('fit-measuring');

      // Mesure synchrone en pixels, indépendante de la taille de l'écran.
      const measureAt = (px: number, lh: number) => {
        textEl.style.fontSize = `${px}px`;
        textEl.style.lineHeight = String(lh);
        const height = textEl.scrollHeight;
        const tops: number[] = [];
        collectTextCenters(textEl).forEach((c) => tops.push(c));
        tops.sort((a, b) => a - b);
        const uniqueTops: number[] = [];
        // À ce stade les trois fontes Médine sont effectivement appliquées.
        // Le seuil d'une demi-ligne réunit les diacritiques d'une même rangée
        // sans fusionner deux rangées successives.
        const sameLineTolerance = Math.max(6, px * lh * 0.5);
        tops.forEach((top) => {
          if (!uniqueTops.some((seen) => Math.abs(top - seen) <= sameLineTolerance)) uniqueTops.push(top);
        });
        const lineCount = uniqueTops.length;
        return { height, lineCount };
      };

      const MEDINA_LINE_COUNT = currentPage === 1 ? 7 : 15;
      // Le Mushaf imprimé utilise un corps large dans une ligne compacte. Sur
      // mobile, ce rapport est indispensable pour garder quinze lignes malgré
      // l'en-tête et les commandes de navigation.
      const MEASURE_LH = Math.max(1.12, 1.18 * lineSpacing);
      // Sur téléphone, une seconde mesure pouvait choisir un corps de 35 px
      // après le chargement de la police et couper le bas de la page. Ce
      // plafond dépend de la largeur réelle, pas du modèle de téléphone.
      // Les champs de navigation et le titre intérieur ont été retirés : la
      // page dispose de plus de hauteur et peut employer un corps plus lisible.
      const responsiveMaxPx = Math.max(MAX_PX, 44);
      const desiredPx = Math.min(responsiveMaxPx, Math.max(MIN_PX, 32 * fontScale));

      // Le nombre de lignes croît avec la taille. Cette recherche trouve le
      // seuil réel, puis absorbe les différences entre Android et iPhone.
      let low = 10;
      let high = responsiveMaxPx;
      let px = low;
      let bestDistance = Number.POSITIVE_INFINITY;
      // Choisir la taille donnant le plus de lignes possible sans dépasser
      // quinze ni la hauteur du cadre : la page se remplit comme à Médine.
      let bestLines = -1;
      for (let candidate = low; candidate <= high; candidate += 0.25) {
        const measured = measureAt(candidate, MEASURE_LH);
        if (measured.height > target) break;
        if (measured.lineCount > MEDINA_LINE_COUNT) continue;
        const distance = Math.abs(candidate - desiredPx);
        if (measured.lineCount > bestLines || (measured.lineCount === bestLines && distance < bestDistance)) {
          px = candidate;
          bestLines = measured.lineCount;
          bestDistance = distance;
        }
      }

      px = Math.floor(px * 10) / 10;

      // Chaque ligne reçoit exactement la même part de la hauteur disponible.
      // Contrairement à l'ancien second ajustement, aucune ligne ne peut être
      // tassée au milieu ni changer d'espacement après le chargement Android.
      const openingRows = textEl.querySelectorAll('[data-surah-opening-row]').length;
      const lh = Number(Math.max(MEASURE_LH, target / Math.max(1, (MEDINA_LINE_COUNT + openingRows) * px)).toFixed(3));

      textEl.style.fontSize = prevFs;
      textEl.style.lineHeight = prevLh;
      textEl.classList.remove('fit-measuring');

      measuredRef.current = true;
      setFontPx((cur) => (Math.abs(cur - px) < 0.4 ? cur : px));
      setLineHeight((cur) => (Math.abs(cur - lh) < 0.02 ? cur : lh));
    };

    let raf = 0;
    const schedule = (force = false) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => measure(force));
    };

    schedule(true);
    // Le contenu (versets, tajweed) et les polices arrivent de façon asynchrone :
    // on surveille quelques secondes, puis on fige la mise en page pour qu'elle
    // ne bouge plus pendant la lecture.
    let ticks = 0;
    const poll = window.setInterval(() => {
      ticks += 1;
      schedule(false);
      if (ticks >= 16) window.clearInterval(poll);
    }, 250);
    const fontFamily =
      riwaya === 'warsh' ? 'warsh-medina' : riwaya === 'qalun' ? 'qalun-medina' : 'hafs-medina';
    const fontSet = (document as Document & { fonts?: FontFaceSet }).fonts;
    // Attendre explicitement la fonte de la lecture courante évite que Hafs
    // ou Qaloun soient calibrés avec la fonte de secours avant son chargement.
    fontSet?.load?.(`24px ${fontFamily}`).then(() => schedule(true));
    fontSet?.ready?.then?.(() => schedule(true));

    const frameEl = frameRef.current;
    let roTimer = 0;
    const ro = frameEl
      ? new ResizeObserver(() => {
          window.clearTimeout(roTimer);
          // Débounce : rotation ou vrai changement de taille seulement.
          roTimer = window.setTimeout(() => schedule(false), 200);
        })
      : null;
    if (frameEl && ro) ro.observe(frameEl);
    // Sur un téléphone lent, les textes Warsh/Qaloun peuvent arriver après la
    // fin de la surveillance initiale : observer aussi le bloc de texte pour
    // recalculer les 15 lignes dès que son contenu change.
    const textElObs = textRef.current;
    if (textElObs && ro) ro.observe(textElObs);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(poll);
      window.clearTimeout(roTimer);
      ro?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontScale, lineSpacing, currentPage, surahNumber, riwaya, usesOfficialMedinaLines]);

  // Les coupures officielles restent immuables. Seul le corps global est
  // réduit, si nécessaire, pour que la ligne Médine la plus large tienne dans
  // le cadre sans masquer un seul mot.
  useLayoutEffect(() => {
    if (!usesOfficialMedinaLines) return;
    const root = textRef.current;
    if (!root) return;
    // Taille de départ proportionnelle à la largeur réelle du cadre : la page
    // s'adapte automatiquement à tout écran (petit téléphone, tablette, grand
    // écran), puis le filet de sécurité ci-dessous réduit si une ligne dépasse.
    // Relue à chaque ajustement pour suivre les rotations et redimensionnements.
    // Taille plafonnée aussi par la hauteur : sur un écran large (PC), les
    // 15 rangées ne doivent jamais se chevaucher.
    const currentDesired = () => {
      const byWidth = (frameRef.current?.clientWidth ?? 360) * 0.068 * fontScale;
      const h = frameRef.current?.clientHeight ?? 0;
      const byHeight = h > 0 ? (h / Math.max(15, officialRows.length)) * 0.82 : byWidth;
      return Math.min(64, Math.max(10, Math.min(byWidth, byHeight)));
    };
    let raf = 0;
    let timer = 0;
    let roTimer = 0;
    // Largeur réelle du contenu d'une ligne = somme des mots (indépendant du
    // sens RTL et de justify-between, qui masquait le dépassement à gauche).
    const resetStretch = () => {
      root.querySelectorAll<HTMLElement>('[data-line-inner]').forEach((inner) => {
        inner.style.transform = '';
        inner.style.width = '';
        inner.style.justifyContent = '';
        inner.querySelectorAll<HTMLElement>('[data-theme-run]').forEach((r) => { r.style.flex = `${r.dataset.grow ?? 1} 1 auto`; r.style.justifyContent = ''; });
      });
    };
    // Largeur naturelle des mots d'une ligne (sans étirement).
    const naturalWidth = (row: HTMLElement) => {
      let used = 0;
      row.querySelectorAll<HTMLElement>('[data-theme-run] > span').forEach((word) => {
        used += word.getBoundingClientRect().width;
      });
      return used;
    };
    const worstRatio = () => {
      let ratio = 1;
      root.querySelectorAll<HTMLElement>('[data-medina-line]').forEach((row) => {
        const available = row.clientWidth;
        if (available <= 0) return;
        const inner = row.querySelector<HTMLElement>('[data-line-inner]');
        if (!inner) return;
        inner.style.width = 'max-content';
        const used = inner.getBoundingClientRect().width;
        inner.style.width = '';
        if (used > 0) ratio = Math.min(ratio, available / used);
      });
      return ratio;
    };
    // Comme le calligraphe du Mushaf de Médine : chaque ligne remplit le cadre
    // d'un bord à l'autre. Les lignes peu remplies élargissent légèrement les
    // lettres (sans casser les liaisons), le reste est réparti entre les mots.
    const stretchLines = () => {
      root.querySelectorAll<HTMLElement>('[data-medina-line]').forEach((row) => {
        const inner = row.querySelector<HTMLElement>('[data-line-inner]');
        const available = row.clientWidth;
        if (!inner || available <= 0) return;
        inner.style.width = 'max-content';
        const used = inner.getBoundingClientRect().width;
        inner.style.width = '';
        if (used <= 0) return;
        const fill = used / available;
        // Ligne de fin de sourate très courte : pas d'étirement excessif.
        if (fill < 0.45 || currentPage <= 2) {
          inner.style.justifyContent = 'center';
          inner.querySelectorAll<HTMLElement>('[data-theme-run]').forEach((r) => { r.style.flexGrow = '0'; r.style.justifyContent = 'center'; });
          return;
        }
        const scale = Math.min(1.35, Math.max(1, (available * 0.985) / used));
        if (scale > 1.005) {
          inner.style.width = `${100 / scale}%`;
          inner.style.transform = `scaleX(${scale})`;
        }
      });
    };
    const fitOfficialLines = () => {
      resetStretch();
      let size = Math.floor(currentDesired() * 0.82 * 10) / 10;
      root.style.fontSize = `${size}px`;
      for (let i = 0; i < 40 && size > 10 && worstRatio() < 0.995; i += 1) {
        size = Math.max(10, Math.floor(size * 0.985 * 10) / 10);
        root.style.fontSize = `${size}px`;
      }
      stretchLines();
      setOfficialFontPx(size);
    };
    raf = requestAnimationFrame(fitOfficialLines);
    const fontSet = (document as Document & { fonts?: FontFaceSet }).fonts;
    fontSet?.load?.('24px hafs-medina').then(() => {
      timer = window.setTimeout(fitOfficialLines, 50);
    });
    fontSet?.ready?.then?.(() => requestAnimationFrame(fitOfficialLines));
    const frameEl = frameRef.current;
    const ro = frameEl
      ? new ResizeObserver(() => {
          window.clearTimeout(roTimer);
          roTimer = window.setTimeout(fitOfficialLines, 120);
        })
      : null;
    if (frameEl && ro) ro.observe(frameEl);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      window.clearTimeout(roTimer);
      ro?.disconnect();
    };
  }, [usesOfficialMedinaLines, officialMedinaLines, officialRows, currentPage, fontScale, themeOpacityPct]);




  return (
    <div
      ref={rootRef}
      className={cn(
        'fixed inset-y-0 z-[70] h-[100dvh] bg-background overflow-hidden',
        spreadSide === 'left' ? 'left-0 w-1/2 border-r-2 border-secondary/60' : spreadSide === 'right' ? 'right-0 w-1/2' : 'inset-x-0 w-screen',
        spreadSide && !isCompanion && 'z-[72]',
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
          showMenuButton || spreadSide
            ? 'pb-[calc(env(safe-area-inset-bottom,0px)+3.75rem)]'
            : 'pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]'
        )}
        style={{
          backgroundColor: 'hsl(195, 80%, 96%)',
          paddingInline: 'calc(env(safe-area-inset-left, 0px) + 2px)',
        }}
      >
        {/* Cadre de page façon Mushaf : bordure double, contenu centré */}
        <div
          className="mx-auto h-full w-full overflow-hidden [container-type:inline-size]"
          // Format portrait d'une page Médine, comme sur téléphone, même sur écran large.
          style={{ maxWidth: 'calc(100dvh * 0.7)' }}
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

            {/* En-tête unique : sourate, page cliquable au centre et Juz. */}
            <div
              dir="rtl"
              className="mb-1 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-1 rounded-lg border px-2 py-1"
              style={{
                borderColor: 'hsl(43, 55%, 58%)',
                backgroundColor: 'hsl(43, 62%, 45% / 0.08)',
              }}
            >
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="min-w-0 shrink-0 whitespace-nowrap rounded-md px-1 py-0.5 text-right font-amiri text-base font-bold sm:text-lg"
                style={{ color: 'hsl(43, 62%, 25%)' }}
                aria-label={t('chooseSurah')}
              >
                سورة {surah?.nameArabic ?? ''}
              </button>
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label={t('choosePage')}
                className="whitespace-nowrap rounded-full border-2 px-2 py-0.5 text-xs font-bold shadow-sm sm:text-sm"
                style={{
                  backgroundColor: 'hsl(195, 80%, 96%)',
                  borderColor: 'hsl(43, 62%, 45%)',
                  color: 'hsl(43, 62%, 25%)',
                }}
              >
                <MushafPageBadge page={currentPage} />
              </button>
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="min-w-0 truncate rounded-md px-1 py-0.5 text-left font-amiri text-base font-bold sm:text-lg"
                style={{ color: 'hsl(43, 62%, 25%)' }}
                aria-label={t('chooseJuz')}
              >
                الجزء {toArabicDigits(currentJuz)}
              </button>
            </div>

            <div
              ref={frameRef}
              data-mushaf-page-frame
              className="flex min-h-0 w-full flex-1 flex-col items-center justify-start overflow-hidden rounded-lg border-2"
              style={{
                borderColor: 'hsl(43, 55%, 58%)',
                paddingInline: '0.35em',
                paddingBlock: '0.4em',
              }}
            >

              {showBismillah && !usesOfficialMedinaLines && (
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
          data-mushaf-page-text
          dir="rtl"
          lang="ar"
          className={cn(
            'quran-text tajweed-text mx-auto w-full max-w-3xl text-foreground',
            usesOfficialMedinaLines && 'grid min-h-0 flex-1',
            riwaya === 'hafs' && 'font-mushaf-hafs',
            riwaya === 'warsh' && 'font-mushaf-warsh',
            riwaya === 'qalun' && 'font-mushaf-qalun'
          )}
          style={{
            // Pages 1-2 (Al-Fatiha, début Al-Baqarah) : bloc centré verticalement
            // dans la page, comme dans le Mushaf imprimé.
            gridTemplateRows: usesOfficialMedinaLines
              ? currentPage <= 2
                ? `repeat(${officialRows.length}, auto)`
                : `repeat(${officialRows.length}, minmax(0, 1fr))`
              : undefined,
            alignContent: usesOfficialMedinaLines && currentPage <= 2 ? 'center' : undefined,
            rowGap: usesOfficialMedinaLines && currentPage <= 2 ? '0.55em' : undefined,
            fontSize: usesOfficialMedinaLines
              ? `${officialFontPx}px`
              : fontPx
                ? `${fontPx}px`
                : 'clamp(18px, 6vw, 34px)',
            // L'alignement à droite conserve l'espacement naturel du texte
            // coranique. La justification forcée étirait chaque ligne et
            // créait des vides artificiels entre les mots, surtout en bas.
            // Présentation proche du Mushaf imprimé de référence : les lignes
            // ordinaires occupent toute la largeur, tandis que la dernière
            // ligne d'un passage reste centrée sans grands blancs artificiels.
            textAlign: 'justify',
            textAlignLast: 'center',
            wordSpacing: 'normal',

            lineHeight: usesOfficialMedinaLines ? 1 : lineHeight,
            flexShrink: 0,
            // Épaisseur visuelle semi-gras via un fin contour : le contour
            // ne modifie PAS les métriques du texte (contrairement à
            // font-weight synthétique), donc les coupures de lignes
            // officielles de Médine restent intactes, aucun mot ne bouge.
            WebkitTextStroke: '0.022em currentColor',
            fontWeight: 400,
            overflowWrap: 'break-word',
          }}

        >
          {usesOfficialMedinaLines && officialMedinaLines ? (
            officialRows.map((row, rowIndex) => {
              if (row.kind !== 'content') {
                const headerSurah = surahs.find(item => item.number === row.surah);
                return (
                  <div key={`opening-${rowIndex}`} data-surah-opening-row={row.kind} data-opening-surah={row.surah}
                    className="flex min-h-0 w-full items-center justify-center whitespace-nowrap text-center font-amiri font-bold text-foreground">
                    {row.kind === 'title' ? (
                      // Cartouche décoratif, comme le titre encadré du Mushaf imprimé.
                      <span className="surah-title-frame" style={{ fontSize: '0.9em' }}>
                        سورة {headerSurah?.nameArabic ?? ''}
                      </span>
                    ) : 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'}
                  </div>
                );
              }
              const lineNumber = row.line;
              const words = officialMedinaLines[lineNumber] ?? [];
              const themedRuns = words.reduce<Array<{
                key: string;
                theme: ReturnType<typeof getPrimaryThemeForVerse>['theme'];
                words: MedinaLineWord[];
              }>>((runs, word) => {
                const indexedThemeId = verseThemes?.[`${word.surah}:${word.verse}`];
                const theme = indexedThemeId
                  ? getThemeById(indexedThemeId) ?? null
                  : getPrimaryThemeForVerse(word.surah, word.verse).theme;
                const key = theme?.id ?? 'none';
                const last = runs[runs.length - 1];
                if (last?.key === key) last.words.push(word);
                else runs.push({ key, theme, words: [word] });
                return runs;
              }, []);

              // Lignes courtes (fin de sourate, pages 1–2) : mots resserrés et centrés,
              // l'aplat thématique couvre toujours toute la largeur.

              return (
                <div
                  key={`medina-line-${lineNumber}`}
                  data-medina-line={lineNumber}
                  className="flex w-full min-w-0 items-center overflow-visible whitespace-nowrap"
                >
                  <div
                    data-line-inner=""
                    className="flex h-full w-full items-stretch justify-between"
                    style={{ transformOrigin: 'right center' }}
                  >
                  {themedRuns.map((run, runPosition) => (
                      <span
                        key={`${lineNumber}-${run.key}-${runPosition}`}
                        data-theme={run.theme?.id}
                        data-theme-run=""
                        data-grow={run.words.length}
                        className="flex items-center justify-between gap-x-[0.18em] self-stretch px-[0.08em]"
                        style={{
                          // Le sous-titre thématique remplit l'espace en proportion du nombre de mots.
                          flex: `${run.words.length} 1 auto`,
                          backgroundColor: run.theme
                            ? `hsl(${run.theme.bgHsl} / ${thematicPaperOpacity})`
                            : undefined,
                        }}
                      >
                        {run.words.map((word, wordPosition) => {
                          const isCurrent = word.surah === surahNumber && currentVerse === word.verse;
                          const wordActive = highlightCurrentVerse && isCurrent && isAudioPlaying;
                          const isAllahName = word.kind === 'word' && word.text
                            .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
                            .replace(/\u0671/g, '\u0627')
                            .includes('\u0627\u0644\u0644\u0647');
                          const html = word.kind === 'word'
                            ? sanitizeTajweedHtml(applyAutoTajweed(hafsDisplayText(word.text)))
                            : word.text;
                          return (
                            <span
                              key={`${word.surah}-${word.verse}-${word.kind}-${wordPosition}`}
                              data-verse={word.surah === surahNumber ? word.verse : undefined}
                              data-w={word.kind === 'word' ? word.wordIndex : undefined}
                              onClick={() => {
                                setMenuSurah(word.surah);
                                setMenuVerse(word.verse);
                              }}
                              className={cn(
                                'cursor-pointer',
                                isAllahName && '[&_span]:!text-foreground',
                                wordActive && 'verse-reciting'
                              )}
                            >
                              {word.kind === 'word' && word.wordIndex === 0 && juzStartKeys.has(`${word.surah}:${word.verse}`) && (
                                <span
                                  aria-label={`Début du Juz ${getJuzForVerse(word.surah, word.verse)}`}
                                  className="mx-[0.08em] inline-flex size-[1.3em] shrink-0 items-center justify-center rounded-full border-[0.08em] bg-background/70 align-middle font-amiri text-[0.55em] font-bold leading-none"
                                  style={{ borderColor: 'hsl(var(--verse-number))', color: 'hsl(var(--verse-number))' }}
                                >
                                  ۞
                                </span>
                              )}
                              {word.kind === 'end' ? (
                                <span
                                  aria-label={`Fin du verset ${word.text}`}
                                  className="mx-[0.04em] inline-flex size-[1.22em] shrink-0 items-center justify-center rounded-full border-[0.08em] bg-background/70 align-middle font-amiri text-[0.5em] font-bold leading-none"
                                  style={{ borderColor: 'hsl(var(--verse-number))', color: 'hsl(var(--verse-number))' }}
                                >
                                  {word.text.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))}
                                </span>
                              ) : (
                                <span dangerouslySetInnerHTML={{ __html: html }} />
                              )}
                            </span>
                          );
                        })}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })
          ) : pageSections.map((section) => {
            const sectionSurah = surahs.find((s) => s.number === section.surahNumber);
            const isMainSurah = section.surahNumber === surahNumber;
            return (
            <span key={`sec-${section.surahNumber}`} style={{ display: 'inline' }}>
            {section.startsHere && (
              <span data-surah-opening-row="title" data-opening-surah={section.surahNumber}
                className="block w-full text-center font-amiri font-bold text-foreground">
                سورة {sectionSurah?.nameArabic ?? ''}
              </span>
            )}
            {section.startsHere && surahHasHeaderBasmala(section.surahNumber) && (
              <span
                dir="rtl"
                style={{ display: 'block', width: '100%', textAlign: 'center' }}
              >
                <span
                  data-surah-opening-row="basmala"
                  data-opening-surah={section.surahNumber}
                  className="block font-amiri font-extrabold text-foreground"
                  style={{ fontSize: '1.0em', margin: '0.1em 0 0.15em' }}
                >
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </span>
              </span>
            )}
            {section.groups.map((group, gi) => {
            const theme = group.theme;
            return (
            <span
              key={`g-${gi}`}
              data-theme={theme?.id}
              data-curated={group.curated ? '1' : '0'}
              style={{
                // Le thème suit le flux imprimé sans créer une nouvelle ligne :
                // un changement de couleur ne modifie jamais les 15 coupures.
                display: 'inline',
                backgroundColor: theme
                  ? `hsl(${theme.bgHsl} / ${thematicPaperOpacity})`
                  : undefined,
                borderRadius: 0,
                boxDecorationBreak: 'clone',
                WebkitBoxDecorationBreak: 'clone',
              }}
            >
              {group.verses.map((v) => {
                // Seule la sourate ouverte est interactive (lecture, menu,
                // surbrillance) ; les versets des sourates voisines présents
                // sur la même page sont affichés pour compléter la page.
                const isCurrent = isMainSurah && currentVerse === v.number;
                const wordSync = isCurrent && currentWords;
                const html = wordSync ? currentWords.html : v.html;
                return (
                  <span
                    key={v.number}
                    data-mushaf-verse-row
                    data-verse={isMainSurah ? v.number : undefined}
                    onClick={() => {
                      setMenuSurah(section.surahNumber);
                      setMenuVerse(v.number);
                    }}
                    style={{
                      // Le fond est porté par chaque verset, et non uniquement
                      // par le groupe : toute l'âyah reste ainsi colorée, même
                      // lorsqu'elle revient à la ligne. La couleur forte du
                      // thème est diluée pour rester claire sans masquer le Tajweed.
                      backgroundColor: 'transparent',
                      boxDecorationBreak: 'clone',
                      WebkitBoxDecorationBreak: 'clone',
                      paddingInline: undefined,
                    }}
                    className="inline cursor-pointer"
                  >
                    {juzStartKeys.has(`${section.surahNumber}:${v.number}`) && (
                      <span
                        aria-label={`Début du Juz ${getJuzForVerse(section.surahNumber, v.number)}`}
                        className="mx-[0.08em] inline-flex size-[1.3em] shrink-0 items-center justify-center rounded-full border-[0.08em] bg-background/70 align-middle font-amiri text-[0.55em] font-bold leading-none"
                        style={{ borderColor: 'hsl(var(--verse-number))', color: 'hsl(var(--verse-number))' }}
                      >
                        ۞
                      </span>
                    )}
                    <span data-mushaf-verse-content dangerouslySetInnerHTML={{ __html: html }} />
                     <span
                      aria-label={`Fin du verset ${v.number}`}
                      className="mx-[0.04em] inline-flex size-[1.22em] shrink-0 items-center justify-center rounded-full border-[0.08em] bg-background/70 align-middle font-amiri text-[0.5em] font-bold leading-none"
                      style={{ borderColor: 'hsl(var(--verse-number))', color: 'hsl(var(--verse-number))' }}
                    >
                      {toArabicDigits(v.number)}
                    </span>{' '}
                  </span>
                );
              })}
            </span>
            );
          })}
            </span>
            );
          })}
          {!usesOfficialMedinaLines && pageSections.every((s) => s.groups.every((g) => g.verses.length === 0)) && (
            <p className="text-center text-muted-foreground text-base">
              Aucun verset sur cette page.
            </p>
          )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barre de commandes rapides, à fleur du cadre et masquable à la demande. */}
      {showMenuButton && !isCompanion ? (
        <div
          className="fixed left-1/2 z-[80] flex max-w-[96vw] -translate-x-1/2 flex-nowrap items-center justify-start gap-0.5 overflow-x-auto rounded-full border border-primary/25 bg-background/90 px-1.5 py-1.5 shadow-2xl backdrop-blur sm:justify-center"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)' }}
        >
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t('nextPage')}
            onClick={goNext}
            className="h-9 w-9 shrink-0 rounded-full text-primary"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t('prevVerse')}
            onClick={() => onPreviousVerse?.()}
            className="hidden h-9 w-9 shrink-0 rounded-full text-primary min-[400px]:inline-flex"
          >
            <SkipBack className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            size="icon"
            aria-label={isAudioPlaying ? t('pause') : t('play')}
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
                {t(activeScope)}
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
              className="hidden h-9 w-8 shrink-0 rounded-full text-primary min-[420px]:inline-flex"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          {onOpenAudioMenu && !isCompanion && (
            <Button
              type="button"
              size="icon"
              aria-label="Menu audio"
              onClick={onOpenAudioMenu}
              className="h-8 w-8 shrink-0 rounded-full bg-primary text-primary-foreground"
            >
              <Headphones className="h-4 w-4" />
            </Button>
          )}
          {onSpeedChange && (
            <Button
              type="button"
              variant="outline"
              aria-label={`Vitesse de lecture : ${playbackSpeed}x`}
              onClick={() => {
                const steps = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
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
            aria-label={t('nextVerse')}
            onClick={() => onNextVerse?.()}
            className="hidden h-9 w-9 shrink-0 rounded-full text-primary min-[400px]:inline-flex"
          >
            <SkipForward className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t('prevPage')}
            onClick={goPrev}
            className="h-9 w-9 shrink-0 rounded-full text-primary"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={isFullscreen ? t('exitFullscreen') : t('fullscreen')}
            onClick={toggleFullscreen}
            className="h-9 w-9 shrink-0 rounded-full text-primary"
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t('backHome')}
            onClick={() => window.location.assign('/app')}
            className="h-9 w-9 shrink-0 rounded-full text-primary"
          >
            <Home className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t('quranSearchTitle')}
            title={t('quranSearchTitle')}
            onClick={() => window.location.assign('/search')}
            className="h-9 w-9 shrink-0 rounded-full text-primary"
          >
            <Search className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t('mushafControls')}
            onClick={() => setMenuOpen(true)}
            onDoubleClick={() => setShowMenuButton(false)}
            className="h-9 w-9 shrink-0 rounded-full text-primary"
          >
            <Menu className="h-5 w-5" />
          </Button>
          {onToggleTwoPage && (
            <Button
              type="button"
              size="sm"
              variant={twoPageMode ? 'default' : 'ghost'}
              aria-label={twoPageMode ? t('onePage') : t('twoPages')}
              aria-pressed={!!twoPageMode}
              onClick={onToggleTwoPage}
              className="h-9 shrink-0 rounded-full px-2 text-xs font-bold"
              title={twoPageMode ? t('onePage') : t('twoPages')}
            >
              {twoPageMode ? '1' : '2'} <BookOpen className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      ) : isCompanion ? null : (
        <button
          type="button"
          onClick={() => setShowMenuButton(true)}
          aria-label={t('mushafControls')}
          className="fixed bottom-0 left-1/2 z-[80] h-8 w-24 -translate-x-1/2 rounded-t-full bg-primary/15"
        >
          <span className="mx-auto block h-1 w-10 rounded-full bg-primary/60" />
        </button>
      )}

      {/* Quick access Sheet: settings, audio, recording */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent dir={t.lang === 'ar' ? 'rtl' : 'ltr'} side="bottom" className="z-[90] max-h-[88dvh] rounded-t-2xl overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
          <SheetHeader>
            <SheetTitle>{t('mushafControls')}</SheetTitle>
            <SheetDescription className="sr-only">{t('mushafControls')}</SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            <section>
              <h4 className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">{t('readingMode')}</h4>
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-2">
                <Button type="button" className="gap-2" aria-pressed="true">
                  <BookOpen className="h-4 w-4" />
                  {t('pages')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="gap-2"
                  onClick={() => {
                    setMenuOpen(false);
                    onSwitchToVerses?.();
                  }}
                >
                  <FileText className="h-4 w-4" />
                  {t('verses')}
                </Button>
              </div>
            </section>
            <section>
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{t('pages')}</h4>
              <div className="mb-2 text-center text-sm font-medium text-foreground">
                {t.lang === 'ar' ? surah?.nameArabic : surah?.name} · {t('page')} {currentPage}/604
                {currentVerse ? ` · ${t('verse')} ${currentVerse}` : ''}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="default"
                  onClick={() => { goNext(); setMenuOpen(false); }}
                  disabled={currentPage >= 604}
                  className="h-12 justify-center gap-2"
                >
                  <ChevronLeft className="h-5 w-5" />
                  {t('nextPage')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { goPrev(); setMenuOpen(false); }}
                  disabled={currentPage <= 1}
                  className="h-12 justify-center gap-2"
                >
                  {t('prevPage')}
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </section>

            <section>
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                {t('navigation')}
              </h4>
              <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">{t('surah')}</label>
                  <div className="flex gap-2">
                    <Select
                      value={String(pendingSurah ?? surahNumber)}
                      onValueChange={(v) => setPendingSurah(Number(v))}
                    >
                      <SelectTrigger className="h-11 flex-1">
                        <SelectValue placeholder={t('chooseSurah')} />
                      </SelectTrigger>
                      <SelectContent className="z-[120] max-h-72">
                        <div className="sticky top-0 z-10 bg-popover p-1">
                          <Input
                            value={surahQuery}
                            onChange={(e) => setSurahQuery(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            placeholder={t('searchSurah')}
                            className="h-9"
                          />
                        </div>
                        {filteredSurahOptions.map((s) => (
                          <SelectItem key={s.number} value={String(s.number)}>
                            {s.number}. {t.lang === 'ar' ? s.nameArabic : s.name}
                          </SelectItem>
                        ))}
                        {filteredSurahOptions.length === 0 && (
                          <div className="p-2 text-center text-sm text-muted-foreground">
                            {t('noSurahFound')}
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      className="h-11 px-5"
                      disabled={pendingSurah === null || pendingSurah === surahNumber}
                      onClick={() => {
                        if (pendingSurah === null) return;
                        setMenuOpen(false);
                        onNavigateToSurah?.(pendingSurah);
                      }}
                    >
                      {t('go')}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">{t('page')}</label>
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
                        {t('go')}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      {t('verse')}
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={verses.length || 1}
                        inputMode="numeric"
                        value={verseInput}
                        onChange={(e) => setVerseInput(e.target.value)}
                        placeholder="1"
                        className="h-11"
                      />
                      <Button
                        className="h-11"
                        onClick={() => {
                          const n = parseInt(verseInput, 10);
                          if (Number.isFinite(n)) {
                            setVerseInput('');
                            setMenuOpen(false);
                            goToVerse(n);
                          }
                        }}
                      >
                        {t('go')}
                      </Button>
                    </div>
                  </div>
                </div>


                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">{t('juz')}</label>
                  <Select
                    value={String(currentJuz)}
                    onValueChange={(v) => {
                      onNavigateToJuz?.(Number(v));
                      setMenuOpen(false);
                    }}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder={t('chooseJuz')} />
                    </SelectTrigger>
                    <SelectContent className="z-[120] max-h-72">
                      {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
                        <SelectItem key={j} value={String(j)}>
                          {t('juz')} {j}{t.lang === 'ar' ? ` — ${juzMapping[j]?.name ?? ''}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <section>
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{t('audio')}</h4>
              {audioControls ?? (
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3">
                  {onPreviousVerse && (
                    <Button size="icon" variant="outline" onClick={onPreviousVerse} aria-label={t('prevVerse')}>
                      <SkipBack className="h-4 w-4" />
                    </Button>
                  )}
                  {onPlayPause && (
                    <Button
                      size="icon"
                      onClick={() => { onPlayPause(); }}
                      className="h-11 w-11 rounded-full"
                      aria-label={isAudioPlaying ? t('pause') : t('play')}
                    >
                      {isAudioPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </Button>
                  )}
                  {onNextVerse && (
                    <Button size="icon" variant="outline" onClick={onNextVerse} aria-label={t('nextVerse')}>
                      <SkipForward className="h-4 w-4" />
                    </Button>
                  )}
                  <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                    <Volume2 className="h-3.5 w-3.5" />
                    {currentVerse ? `${t('verse')} ${currentVerse}` : '—'}
                  </span>
                </div>
              )}
            </section>

            {voiceControls && (
              <section>
                <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{t('voiceCommand')}</h4>
                <div className="rounded-2xl border border-border bg-card p-3">
                  {voiceControls}
                </div>
              </section>
            )}

            <section>
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{t('recording')}</h4>
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
                {t('recordVerse')} {currentVerse ?? pageVerses[0]?.number ?? ''}
              </Button>
            </section>

            <section>
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                {t('readability')}
              </h4>
              <div className="space-y-3 rounded-2xl border border-border bg-card p-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t('fontSize')}</span>
                    <span className="font-bold text-foreground">{fontScalePct}%</span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={160}
                    step={5}
                    value={fontScalePct}
                    onChange={(e) => setFontScalePct(Number(e.target.value))}
                    className="w-full accent-primary"
                    aria-label={t('fontSize')}
                  />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t('lineSpacing')}</span>
                    <span className="font-bold text-foreground">{lineSpacingPct}%</span>
                  </div>
                  <input
                    type="range"
                    min={80}
                    max={150}
                    step={5}
                    value={lineSpacingPct}
                    onChange={(e) => setLineSpacingPct(Number(e.target.value))}
                    className="w-full accent-primary"
                    aria-label={t('lineSpacing')}
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px]"
                    onClick={() => {
                      setFontScalePct(100);
                      setLineSpacingPct(100);
                      setThemeOpacityPct(20);
                    }}
                  >
                    {t('reset')}
                  </Button>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t('themeBackground')}</span>
                    <span className="font-bold text-foreground">{themeOpacityPct}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={40}
                    step={1}
                    value={themeOpacityPct}
                    onChange={(e) => setThemeOpacityPct(Number(e.target.value))}
                    className="w-full accent-primary"
                    aria-label={t('themeOpacity')}
                  />
                </div>
                
              </div>
            </section>

            <section>
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{t('settings')}</h4>
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
                {isFullscreen ? t('exitFullscreen') : t('fullscreen')}
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
                {t('resetApp')}
              </Button>
            </section>
          </div>
        </SheetContent>
      </Sheet>

      {/* Choix de la portée de lecture : verset, page, sourate, juz */}
      <Dialog open={scopeOpen} onOpenChange={setScopeOpen}>
        <DialogContent className="sm:max-w-sm z-[120]">
          <DialogHeader>
            <DialogTitle>{t('chooseReading')}</DialogTitle>
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
            <div className="space-y-1.5 pt-1">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Repeat className="h-3.5 w-3.5" />
                {t('repeatCount')}
              </p>
              <div className="grid grid-cols-6 gap-1">
                {[1, 2, 3, 5, 10, 0].map((n) => (
                  <Button
                    key={n}
                    variant={repeatCount === n ? 'default' : 'outline'}
                    size="sm"
                    className="h-9 px-0 text-xs"
                    onClick={() => setRepeatCount(n)}
                  >
                    {n === 0 ? '∞' : n}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recorder dialog */}

      <Dialog open={recorderVerse !== null} onOpenChange={(o) => !o && setRecorderVerse(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto z-[120]">
          <DialogHeader>
            <DialogTitle>
              {t('recording')} — {surah?.name} · {t('verse')} {recorderVerse}
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
        <DialogContent className="sm:max-w-sm z-[120]">
          <DialogHeader>
            <DialogTitle>
              {t('verse')} {menuVerse} — {surahs.find((s) => s.number === menuSurah)?.name ?? surah?.name}
            </DialogTitle>
          </DialogHeader>
          {menuVerse !== null && (() => {
            const indexedThemeId = verseThemes?.[`${menuSurah}:${menuVerse}`];
            const indexedTheme = indexedThemeId ? getThemeById(indexedThemeId) : undefined;
            const themes = indexedTheme ? [indexedTheme] : getThemesForVerse(menuSurah, menuVerse);
            const isMenuMainSurah = menuSurah === surahNumber;
            return (
              <div className="flex flex-col gap-2">
                {themes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    {themes.map((t) => (
                      <span
                        key={t.id}
                        className="text-xs px-2 py-1 rounded-full border"
                        style={{
                        backgroundColor: `hsl(${t.bgHsl} / ${themeOpacity})`,
                          borderColor: `hsl(${t.hsl} / 0.55)`,
                        }}
                      >
                        {t.emoji} {t.labels[lang]}
                      </span>
                    ))}
                  </div>
                )}
                {isMenuMainSurah && (
                  <>
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
                      {t('listenVerse')}
                    </Button>
                  </>
                )}
                {!isMenuMainSurah && (
                  <Button
                    variant="default"
                    onClick={() => {
                      setMenuVerse(null);
                      onNavigateToSurah?.(menuSurah);
                    }}
                    className="justify-start gap-2"
                  >
                    <Play className="h-4 w-4" />
                    {t('openToListen')}
                  </Button>
                )}
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
                  {t('translationTafsir')}
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
                  {t('tafsir')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setMenuVerse(null)}
                  className="justify-start gap-2 text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                  {t('cancel')}
                </Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Traduction et Tafsir trilingues, y compris pour une sourate voisine. */}
      <Dialog open={detailVerse !== null} onOpenChange={(o) => !o && setDetailVerse(null)}>
        <DialogContent className="w-full max-w-[calc(100vw-1rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto z-[120] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>
              {surahs.find((s) => s.number === menuSurah)?.name ?? surah?.name} · {t('verse')} {detailVerse}
            </DialogTitle>
          </DialogHeader>
          {detailVerse !== null && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={detailMode === 'verse' ? 'default' : 'outline'} onClick={() => setDetailMode('verse')}>
                {t('thisVerse')}
              </Button>
              <Button size="sm" variant={detailMode === 'page' ? 'default' : 'outline'} onClick={() => setDetailMode('page')}>
                <BookOpen className="h-4 w-4 mr-1" /> {t('page')} {currentPage}
              </Button>
              {onPlayRange && (
                <Button size="sm" variant="secondary" onClick={() => { setDetailVerse(null); startScope('page'); }}>
                  <Volume2 className="h-4 w-4 mr-1" /> {t('listenPage')}
                </Button>
              )}
            </div>
          )}
          {detailVerse !== null && detailMode === 'page' && (() => {
            const groups = fullPageGroups?.length
              ? fullPageGroups.map((g) => ({ surahNumber: g.surahNumber, verses: g.verses.map((v) => ({ number: v.number, html: v.html })) }))
              : [{ surahNumber, verses: pageVerses.map((v) => ({ number: v.number, html: versesTajweed[v.number] ?? v.text })) }];
            return (
              <div className="space-y-3">
                {groups.map((g) => (
                  <div key={g.surahNumber} className="space-y-2">
                    <p className="text-sm font-semibold text-primary">{surahs.find((s) => s.number === g.surahNumber)?.name}</p>
                    {g.verses.map((v) => (
                      <button
                        key={`${g.surahNumber}-${v.number}`}
                        type="button"
                        onClick={() => { setMenuSurah(g.surahNumber); setDetailVerse(v.number); setDetailMode('verse'); }}
                        className={cn(
                          'w-full rounded-md border p-2 text-right font-amiri text-xl leading-loose hover:bg-accent',
                          g.surahNumber === menuSurah && v.number === detailVerse && 'border-primary bg-primary/5'
                        )}
                        dir="rtl"
                      >
                        <span dangerouslySetInnerHTML={{ __html: sanitizeTajweedHtml(v.html) }} />
                        <span className="mx-1 text-sm text-muted-foreground">﴿{v.number}﴾</span>
                      </button>
                    ))}
                  </div>
                ))}
                
              </div>
            );
          })()}
          {detailVerse !== null && detailMode === 'verse' && (() => {
            const pageVerse = fullPageGroups
              ?.find((group) => group.surahNumber === menuSurah)
              ?.verses.find((verse) => verse.number === detailVerse);
            const mainVerse = menuSurah === surahNumber
              ? verses.find((verse) => verse.number === detailVerse)
              : undefined;
            const arabicHtml = pageVerse?.html ?? versesTajweed[detailVerse] ?? mainVerse?.text;
            if (!arabicHtml) return null;
            return (
              <div className="space-y-4">
                <MushafVerseStudy
                  surahNumber={menuSurah}
                  verseNumber={detailVerse}
                  arabicHtml={arabicHtml}
                />
                {/* Tafsir thématique de la fiche du passage, ouvert d'emblée. */}
                <ThematicTafsirPanel
                  key={`${menuSurah}:${detailVerse}`}
                  surahNumber={menuSurah}
                  verseNumber={detailVerse}
                  indexedThemeId={verseThemes?.[`${menuSurah}:${detailVerse}`]}
                  paragraph={detailParagraph}
                  isOpen={true}
                  onToggle={() => setThemeVerse(detailVerse)}
                />
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Thematic tafsir dialog */}
      <Dialog open={themeVerse !== null} onOpenChange={(o) => !o && setThemeVerse(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto z-[120]">
          <DialogHeader>
            <DialogTitle>
              {t('tafsir')} — {surahs.find((s) => s.number === menuSurah)?.name ?? surah?.name} · {t('verse')} {themeVerse}
            </DialogTitle>
          </DialogHeader>
          {themeVerse !== null && (
            <ThematicTafsirPanel
              surahNumber={menuSurah}
              verseNumber={themeVerse}
              indexedThemeId={verseThemes?.[`${menuSurah}:${themeVerse}`]}
              paragraph={themeParagraph}
              isOpen={true}
              onToggle={() => setThemeVerse(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
