import { useT } from '@/lib/i18n';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { VerseCard } from '@/components/VerseCard';
import { VerseRecorder } from '@/components/VerseRecorder';
import { HafsTajweedPageView } from '@/components/HafsTajweedPageView';
import { MushafPageBadge } from '@/components/MushafPageBadge';
import { useFullMushafPage } from '@/hooks/useFullMushafPage';
import { AudioPlayer } from '@/components/AudioPlayer';
import { RecitationMenu, type RecitationStartConfig } from '@/components/RecitationMenu';
import { VoiceCommandButton } from '@/components/VoiceCommandButton';
import { SettingsDialog } from '@/components/SettingsDialog';
import { TajweedLegend } from '@/components/TajweedLegend';
import { ThemeLegend } from '@/components/ThemeLegend';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { RECITERS, useQuranAudio } from '@/hooks/useQuranAudio';
import { useQuranData } from '@/hooks/useQuranData';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useWarshData } from '@/hooks/useWarshData';
import { useQalunData } from '@/hooks/useQalunData';
import { useAuth } from '@/hooks/useAuth';
import { useReadingProgress } from '@/hooks/useReadingProgress';
import { saveLocalReadingPosition } from '@/lib/readingPosition';
import { surahs, Surah, juzMapping, getVersePage, getFirstVerseOfPage, getJuzForVerse, type Verse } from '@/data/surahs';
import { toast } from 'sonner';
import { Loader2, FileText, Layers, Play, BookOpen, Headphones, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// (page start -> surah) mapping for navigation
const PAGE_START_MAP: [number, number][] = [
  [1, 1], [2, 2], [50, 3], [77, 4], [106, 5], [128, 6], [151, 7],
  [177, 8], [187, 9], [208, 10], [221, 11], [235, 12], [249, 13],
  [255, 14], [262, 15], [267, 16], [282, 17], [293, 18], [305, 19],
  [312, 20], [322, 21], [332, 22], [342, 23], [350, 24], [359, 25],
  [367, 26], [377, 27], [385, 28], [396, 29], [404, 30], [411, 31],
  [415, 32], [418, 33], [428, 34], [434, 35], [440, 36], [446, 37],
  [453, 38], [458, 39], [467, 40], [477, 41], [483, 42], [489, 43],
  [496, 44], [499, 45], [502, 46], [507, 47], [510, 48], [515, 49],
  [518, 50], [520, 51], [523, 52], [526, 53], [528, 54], [531, 55],
  [534, 56], [537, 57], [542, 58], [545, 59], [549, 60], [551, 61],
  [553, 62], [554, 63], [556, 64], [558, 65], [560, 66], [562, 67],
  [564, 68], [566, 69], [568, 70], [570, 71], [572, 72], [574, 73],
  [575, 74], [577, 75], [578, 76], [580, 77], [582, 78], [583, 79],
  [585, 80], [586, 81], [587, 82], [588, 83], [589, 84], [590, 85],
  [591, 86], [592, 88], [593, 89], [594, 90], [595, 91], [596, 93],
  [597, 95], [598, 97], [599, 99], [600, 101], [601, 103], [602, 106],
  [603, 109], [604, 112],
];

/** Page de début de chaque Juz dans le Mushaf de Médine (604 pages). */
const JUZ_START_PAGES: Record<number, number> = {
  1: 1, 2: 22, 3: 42, 4: 62, 5: 82, 6: 102, 7: 121, 8: 142, 9: 162, 10: 182,
  11: 201, 12: 222, 13: 242, 14: 262, 15: 282, 16: 302, 17: 322, 18: 342,
  19: 362, 20: 382, 21: 402, 22: 422, 23: 442, 24: 462, 25: 482, 26: 502,
  27: 522, 28: 542, 29: 562, 30: 582,
};



const SurahReader = () => {
  const t = useT();
  const navigate = useNavigate();
  const { surahNumber } = useParams<{ surahNumber: string }>();
  const [searchParams] = useSearchParams();
  const [surah, setSurah] = useState<Surah | null>(null);
  const [isAccessibilityMode, setIsAccessibilityMode] = useState(false);
  const [pageInput, setPageInput] = useState('');
  const [juzInput, setJuzInput] = useState('');
  const appSettings = useAppSettings();
  const { isAuthenticated } = useAuth();
  const { saveProgress, getSurahProgress } = useReadingProgress();
  const [lastSavedVerse, setLastSavedVerse] = useState<number | null>(null);
  const [currentMushafPage, setCurrentMushafPage] = useState<number | null>(null);
  const [manualAudioPageRequest, setManualAudioPageRequest] = useState<number | null>(null);
  // Verse range whose text should be hidden during active memorization (per page).
  const [hidingRange, setHidingRange] = useState<{ pageNum: number; start: number; end: number } | null>(null);

  const num = parseInt(surahNumber || '1');

  const getSurahForPage = useCallback((pageNum: number) => {
    let targetSurah = 1;
    for (const [page, s] of PAGE_START_MAP) {
      if (page <= pageNum) targetSurah = s;
      else break;
    }
    return targetSurah;
  }, []);

  // Fetch verses with Tajweed from API
  const { verses, versesTajweed, isLoading: isLoadingVerses, error, isOffline } = useQuranData(num);
  const { warshVerses, isLoading: isLoadingWarsh } = useWarshData(
    num,
    appSettings.textDisplayStyle === 'warsh-tajweed' ||
      appSettings.textDisplayStyle === 'pages-warsh'
  );
  const { qalunVerses, isLoading: isLoadingQalun } = useQalunData(
    num,
    appSettings.textDisplayStyle === 'qalun-tajweed' ||
      appSettings.textDisplayStyle === 'pages-qalun'
  );

  const effectiveDisplayStyle = appSettings.textDisplayStyle;
  const isMushafImageMode = appSettings.textDisplayStyle.startsWith('pages-');
  // Contenu complet de la page affichée (toutes les sourates), comme un Mushaf imprimé.
  const { groups: fullPageGroups } = useFullMushafPage(
    isMushafImageMode ? currentMushafPage : null,
    appSettings.textDisplayStyle
  );
  // Double page côte à côte (choix mémorisé), sur écran large en paysage.
  const [twoPageMode, setTwoPageMode] = useState<boolean>(
    () => localStorage.getItem('mushaf-two-pages') === '1'
  );
  // Menu « التلاوة الصوتية » (récitation audio), commun aux modes Pages et Versets.
  const [recitationMenuOpen, setRecitationMenuOpen] = useState(false);
  const [audioHighlight, setAudioHighlight] = useState<boolean>(
    () => localStorage.getItem('quran-audio-highlight') !== '0'
  );
  const handleAudioHighlightChange = useCallback((enabled: boolean) => {
    setAudioHighlight(enabled);
    localStorage.setItem('quran-audio-highlight', enabled ? '1' : '0');
  }, []);
  const [isWideScreen, setIsWideScreen] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth >= 900 && window.innerWidth > window.innerHeight
  );
  useEffect(() => {
    const onResize = () => setIsWideScreen(window.innerWidth >= 900 && window.innerWidth > window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const toggleTwoPageMode = useCallback(() => {
    setTwoPageMode((v) => {
      localStorage.setItem('mushaf-two-pages', v ? '0' : '1');
      return !v;
    });
  }, []);
  const spreadActive = isMushafImageMode && twoPageMode && isWideScreen && currentMushafPage != null;
  const companionPage = spreadActive
    ? (currentMushafPage! % 2 === 1 ? currentMushafPage! + 1 : currentMushafPage! - 1)
    : null;
  const { groups: companionGroups } = useFullMushafPage(
    companionPage && companionPage >= 1 && companionPage <= 604 ? companionPage : null,
    appSettings.textDisplayStyle
  );
  const companionSurah = companionGroups?.[0]?.surahNumber ?? null;
  const companionVerses = useMemo<Verse[]>(() => {
    const g = companionGroups?.find((x) => x.surahNumber === companionSurah);
    return g ? g.verses.map((v) => ({ number: v.number, text: '', translation: '', page: companionPage! })) : [];
  }, [companionGroups, companionSurah, companionPage]);
  const isLoadingTextSource =
    (effectiveDisplayStyle === 'warsh-tajweed' && isLoadingWarsh) ||
    (effectiveDisplayStyle === 'qalun-tajweed' && isLoadingQalun);

  const handleVerseChange = useCallback((verseNum: number) => {
    // En mode « page par page », le verset peut n'être monté qu'après le
    // changement de page : on réessaie brièvement pour éviter les sauts.
    const tryScroll = (attempt = 0) => {
      const verseElement = document.getElementById(`verse-${verseNum}`);
      if (verseElement) {
        verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (attempt < 8) {
        setTimeout(() => tryScroll(attempt + 1), 150);
      }
    };
    tryScroll();
  }, []);


  const quranAudio = useQuranAudio({
    surahNumber: num,
    totalVerses: surahs.find((s) => s.number === num)?.versesCount ?? 1,
    onSurahChange: (targetSurah, verse) => navigate(`/surah/${targetSurah}?verse=${verse}`),
    reciter: appSettings.reciter,
    onVerseChange: handleVerseChange,
  });

  // Fetch surah metadata
  useEffect(() => {
    const foundSurah = surahs.find(s => s.number === num);
    if (foundSurah) {
      setSurah(foundSurah);
    }
  }, [num]);

  // Scroll to verse from URL param (verse or page)
  useEffect(() => {
    const verseParam = searchParams.get('verse');
    const pageParam = searchParams.get('page');
    
    const scrollToElement = (id: string, attempts = 0) => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'auto', block: 'center' });
        el.classList.add('ring-4', 'ring-secondary', 'search-hit');
        setTimeout(() => el.classList.remove('ring-4', 'ring-secondary', 'search-hit'), 6000);
      } else if (attempts < 60) {
        setTimeout(() => scrollToElement(id, attempts + 1), 80);
      }
    };
    
    if (verseParam) {
      const vn = parseInt(verseParam);
      // Mode Pages : surligner tous les fragments du verset dans le Mushaf.
      const markMushaf = (attempts = 0) => {
        const nodes = document.querySelectorAll<HTMLElement>(`[data-verse="${vn}"]`);
        if (nodes.length) {
          nodes[0].scrollIntoView({ behavior: 'auto', block: 'center' });
          nodes.forEach((n) => n.classList.add('search-hit'));
          setTimeout(() => nodes.forEach((n) => n.classList.remove('search-hit')), 6000);
        } else if (attempts < 60) {
          setTimeout(() => markMushaf(attempts + 1), 80);
        }
      };
      if (isMushafImageMode) markMushaf();
      else scrollToElement(`verse-${vn}`);
    } else if (pageParam && !isMushafImageMode && verses.length > 0) {
      const targetPage = parseInt(pageParam);
      const targetVerse = verses.find(v => {
        const versePage = v.page ?? getVersePage(num, v.number, verses.length);
        return versePage >= targetPage;
      });
      if (targetVerse) {
        scrollToElement(`verse-${targetVerse.number}`);
      }
    }
  }, [searchParams, verses, isMushafImageMode, num]);

  // Save last reading position locally for everyone (offline, no account needed)
  useEffect(() => {
    if (!num) return;
    const verse = quranAudio.currentVerse > 0 ? quranAudio.currentVerse : null;
    if (!verse && !currentMushafPage) return;
    saveLocalReadingPosition({
      surah: num,
      verse,
      page: currentMushafPage,
      style: appSettings.textDisplayStyle,
    });
  }, [num, quranAudio.currentVerse, currentMushafPage, appSettings.textDisplayStyle]);

  // Auto-save reading progress when verse changes
  useEffect(() => {
    if (isAuthenticated && quranAudio.currentVerse > 0 && quranAudio.currentVerse !== lastSavedVerse) {
      const timer = setTimeout(() => {
        saveProgress(num, quranAudio.currentVerse);
        setLastSavedVerse(quranAudio.currentVerse);
      }, 2000); // Debounce save to avoid too many requests
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, quranAudio.currentVerse, num, saveProgress, lastSavedVerse]);

  const handleSaveProgress = useCallback(async (verseNumber: number) => {
    if (!isAuthenticated) {
      toast.info('Connectez-vous pour sauvegarder votre progression');
      return;
    }
    const { error } = await saveProgress(num, verseNumber);
    if (!error) {
      toast.success('Progression sauvegardée');
      setLastSavedVerse(verseNumber);
    }
  }, [isAuthenticated, num, saveProgress]);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleNavigateToSurah = (surahNum: number) => {
    navigate(`/surah/${surahNum}`);
    toast.success(`Navigation vers sourate ${surahNum}`);
  };

  const navigateToMushafPage = (pageNum: number, successMessage: string) => {
    const targetSurah = getSurahForPage(pageNum);

    // Navigation by page should first change the visible Mushaf page. If audio
    // is already playing, the page-sync effect below restarts it at the first
    // verse of the displayed page after the correct verse data is loaded.
    if (quranAudio.isPlaying) {
      setManualAudioPageRequest(pageNum);
    }
    navigate(`/surah/${targetSurah}?page=${pageNum}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.success(successMessage);
  };

  const handleNavigateToPage = (pageNum: number) => {
    navigateToMushafPage(pageNum, `Navigation vers page ${pageNum}`);
  };

  const handleManualMushafPageChange = useCallback((pageNum: number) => {
    if (quranAudio.isPlaying) {
      setManualAudioPageRequest(pageNum);
    }
  }, [quranAudio.isPlaying]);

  const handleNavigateToJuz = (juzNum: number) => {
    const juz = juzMapping[juzNum];
    const page = JUZ_START_PAGES[juzNum];
    if (!juz || !page) return;

    // La page est la référence unique en vue Mushaf. Ajouter aussi un verset
    // faisait entrer les deux destinations en concurrence lors du changement.
    navigateToMushafPage(page, `Juz ${juzNum} — ${juz.name} (page ${page})`);
  };

  const isMushafMode = isMushafImageMode;

  const switchToPages = useCallback(() => {
    const target = appSettings.textDisplayStyle === 'warsh-tajweed'
      ? 'pages-warsh'
      : appSettings.textDisplayStyle === 'qalun-tajweed'
        ? 'pages-qalun'
        : 'pages-hafs';
    appSettings.onTextDisplayStyleChange(target);
  }, [appSettings.textDisplayStyle, appSettings.onTextDisplayStyleChange]);

  const switchToVerses = useCallback(() => {
    const target = appSettings.textDisplayStyle === 'pages-warsh'
      ? 'warsh-tajweed'
      : appSettings.textDisplayStyle === 'pages-qalun'
        ? 'qalun-tajweed'
        : 'tajweed';
    appSettings.onTextDisplayStyleChange(target);
  }, [appSettings.textDisplayStyle, appSettings.onTextDisplayStyleChange]);

  // ---- Affichage « page par page » pour le mode versets (coloriage thématique conservé) ----
  const isPagedVerseView = !isMushafImageMode && appSettings.verseViewMode === 'page';

  const versePageGroups = useMemo(() => {
    const pagesMap = new Map<number, typeof verses>();
    verses.forEach((v) => {
      const p = v.page ?? getVersePage(num, v.number, verses.length);
      if (!pagesMap.has(p)) pagesMap.set(p, []);
      pagesMap.get(p)!.push(v);
    });
    return Array.from(pagesMap.entries()).sort(([a], [b]) => a - b);
  }, [verses, num]);

  const [versePageNum, setVersePageNum] = useState<number | null>(null);

  // Initialise / recadre la page affichée (paramètre ?page= ou 1re page de la sourate)
  useEffect(() => {
    if (!isPagedVerseView || versePageGroups.length === 0) return;
    const available = versePageGroups.map(([p]) => p);
    if (versePageNum !== null && available.includes(versePageNum)) return;
    const pageParam = searchParams.get('page');
    const wanted = pageParam ? parseInt(pageParam) : NaN;
    setVersePageNum(available.includes(wanted) ? wanted : available[0]);
  }, [isPagedVerseView, versePageGroups, versePageNum, searchParams]);

  // Suit la lecture audio : bascule automatiquement sur la page du verset en cours
  useEffect(() => {
    if (!isPagedVerseView || !quranAudio.isPlaying) return;
    const group = versePageGroups.find(([, vs]) =>
      vs.some((v) => v.number === quranAudio.currentVerse)
    );
    if (group && group[0] !== versePageNum) setVersePageNum(group[0]);
  }, [isPagedVerseView, quranAudio.isPlaying, quranAudio.currentVerse, versePageGroups, versePageNum]);

  /**
   * Changement de page manuel en mode « page par page » (versets) :
   * évite les sauts en resynchronisant immédiatement l'audio sur le 1er verset
   * de la page affichée lorsque la lecture est en cours.
   */
  const goToVersePage = useCallback(
    (targetPage: number) => {
      const group = versePageGroups.find(([p]) => p === targetPage);
      if (!group) {
        // Page hors de la sourate courante : navigation classique
        handleNavigateToPage(targetPage);
        return;
      }
      setVersePageNum(targetPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (quranAudio.isPlaying) {
        const first = group[1][0].number;
        if (quranAudio.currentVerse < first || quranAudio.currentVerse > group[1][group[1].length - 1].number) {
          if (quranAudio.repeatSettings.mode === 'range') quranAudio.setRepeatMode('none', 1);
          quranAudio.playVerse(first);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [versePageGroups, quranAudio.isPlaying, quranAudio.currentVerse, quranAudio.playVerse, quranAudio.repeatSettings.mode, quranAudio.setRepeatMode]
  );

  // Page réellement en cours de lecture audio (pour l'indicateur de position)
  const playingVersePage = useMemo(() => {
    if (!isPagedVerseView || !quranAudio.currentVerse) return null;
    const group = versePageGroups.find(([, vs]) =>
      vs.some((v) => v.number === quranAudio.currentVerse)
    );
    return group ? group[0] : null;
  }, [isPagedVerseView, quranAudio.currentVerse, versePageGroups]);


  // Compute verse range for the current Mushaf page using real API page data
  const currentPageVerseRange = useMemo(() => {
    if (!isMushafMode || !currentMushafPage || verses.length === 0) return null;
    const pageVerses = verses.filter(v => v.page === currentMushafPage);
    if (pageVerses.length === 0) return null;
    return { first: pageVerses[0].number, last: pageVerses[pageVerses.length - 1].number };
  }, [isMushafMode, currentMushafPage, verses]);

  // In Mushaf mode: only when the user manually changes page while audio is
  // playing, jump continuous playback to that page. Natural audio progression is
  // handled inside the page view, so it can move forward page by page normally.
  useEffect(() => {
    if (!isMushafMode || !currentPageVerseRange) return;
    if (manualAudioPageRequest !== currentMushafPage) return;
    setManualAudioPageRequest(null);
    if (!quranAudio.isPlaying) return;
    const { first, last } = currentPageVerseRange;
    if (quranAudio.currentVerse >= first && quranAudio.currentVerse <= last) return;
    if (quranAudio.repeatSettings.mode === 'range') {
      quranAudio.setRepeatMode('none', 1);
    }
    quranAudio.playVerse(first);
  }, [
    currentPageVerseRange,
    currentMushafPage,
    isMushafMode,
    manualAudioPageRequest,
    quranAudio.currentVerse,
    quranAudio.isPlaying,
    quranAudio.playVerse,
    quranAudio.repeatSettings.mode,
    quranAudio.setRepeatMode,
  ]);

  const handlePlayRequest = useCallback(() => {
    if (isMushafMode && currentPageVerseRange) {
      if (quranAudio.repeatSettings.mode === 'range') {
        quranAudio.setRepeatMode('none', 1);
      }
      quranAudio.playVerse(currentPageVerseRange.first);
    } else {
      // In text mode: detect first visible verse and start from there
      if (!quranAudio.isPlaying && verses.length > 0) {
        let firstVisible = quranAudio.currentVerse;
        for (let i = 1; i <= verses.length; i++) {
          const el = document.getElementById(`verse-${i}`);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top >= 0 && rect.top < window.innerHeight) {
              firstVisible = i;
              break;
            }
          }
        }
        quranAudio.playVerse(firstVisible);
      } else {
        quranAudio.play();
      }
    }
    toast.success('Lecture démarrée');
  }, [quranAudio, isMushafMode, currentPageVerseRange, verses.length]);

  const handleRecitationStart = useCallback((config: RecitationStartConfig) => {
    quranAudio.pause();
    quranAudio.setRecitationSession(config.session);
    quranAudio.setRepeatPauseSettings({ enabled: config.gapMultiplier > 0, multiplier: config.gapMultiplier || 1 });
    quranAudio.setRepeatMode(config.repeat.mode, config.repeat.count, config.repeat.rangeStart, config.repeat.rangeEnd);
    quranAudio.playVerseAt(config.surah, config.verse);
    setRecitationMenuOpen(false);
    toast.success('Lecture démarrée');
  }, [quranAudio]);

  const voiceCommands = useVoiceCommands({
    onPlay: handlePlayRequest,
    onPause: () => {
      quranAudio.pause();
      toast.info('Lecture en pause');
    },
    onNextVerse: () => {
      quranAudio.nextVerse();
      toast.success(`Verset ${quranAudio.currentVerse + 1}`);
    },
    onPreviousVerse: () => {
      quranAudio.previousVerse();
      toast.success(`Verset ${quranAudio.currentVerse - 1}`);
    },
    onGoHome: handleGoHome,
    onNavigateToSurah: handleNavigateToSurah,
    onNavigateToPage: handleNavigateToPage,
    onNavigateToJuz: handleNavigateToJuz,
    onReadVerse: (verseNum) => {
      if (verseNum >= 1 && verseNum <= verses.length) {
        quranAudio.playVerse(verseNum);
        toast.success(`Lecture du verset ${verseNum}`);
      }
    },
    onRepeatVerse: (count) => {
      quranAudio.setRepeatMode('verse', count);
      toast.success(`Répétition du verset actuel (${count === 0 ? '∞' : count + 'x'})`);
    },
    onRepeatRange: (start, end, count) => {
      if (start >= 1 && end <= verses.length && start <= end) {
        quranAudio.setRepeatMode('range', count, start, end);
        toast.success(`Répétition des versets ${start} à ${end} (${count === 0 ? '∞' : count + 'x'})`);
      } else {
        toast.error('Plage de versets invalide');
      }
    },
    onStopRepeat: () => {
      quranAudio.setRepeatMode('none', 1);
      toast.info('Répétition désactivée');
    },
  });

  if (!surah) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  const voiceCommandControls = (
    <VoiceCommandButton
      isListening={voiceCommands.isListening}
      isContinuousMode={voiceCommands.isContinuousMode}
      isAwaitingCommand={voiceCommands.isAwaitingCommand}
      isSupported={voiceCommands.isSupported}
      onToggle={voiceCommands.toggleListening}
      transcript={voiceCommands.transcript}
      voiceLang={voiceCommands.voiceLang}
      onLangChange={voiceCommands.setVoiceLang}
    />
  );

  const audioPlayerControls = (
    <AudioPlayer
      isPlaying={quranAudio.isPlaying}
      isLoading={quranAudio.isLoading}
      currentVerse={quranAudio.currentVerse}
      totalVerses={verses.length || 1}
      progress={quranAudio.progress}
      reciter={quranAudio.reciter}
      surahNumber={num}
      repeatSettings={quranAudio.repeatSettings}
      currentRepeatCount={quranAudio.currentRepeatCount}
      playbackSpeed={quranAudio.playbackSpeed}
      onPlay={handlePlayRequest}
      onPause={quranAudio.pause}
      onNext={quranAudio.nextVerse}
      onPrevious={quranAudio.previousVerse}
      onReciterChange={appSettings.onReciterChange}
      onSeek={quranAudio.seek}
      onRepeatModeChange={quranAudio.setRepeatMode}
      onSpeedChange={quranAudio.changeSpeed}
      repeatPause={quranAudio.repeatPause}
      isPausingForRepeat={quranAudio.isPausingForRepeat}
      pauseRemainingSec={quranAudio.pauseRemainingSec}
      onRepeatPauseChange={quranAudio.setRepeatPauseSettings}
      surahName={`${surah.name} - ${surah.nameArabic}`}
      embedded={isMushafMode}
    />
  );

  const mushafSettingsControls = (
    <SettingsDialog
      reciter={appSettings.reciter}
      onReciterChange={appSettings.onReciterChange}
      backgroundColor={appSettings.backgroundColor}
      onBackgroundColorChange={appSettings.onBackgroundColorChange}
      textDisplayStyle={appSettings.textDisplayStyle}
      onTextDisplayStyleChange={appSettings.onTextDisplayStyleChange}
      fontSize={appSettings.fontSize}
      onFontSizeChange={appSettings.onFontSizeChange}
      verseViewMode={appSettings.verseViewMode}
      onVerseViewModeChange={appSettings.onVerseViewModeChange}
      triggerLabel={t('settings')}
      triggerClassName="w-full justify-start gap-2 border-2 border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground"
    />
  );

  return (
    <div
      className={isMushafMode ? 'h-[100dvh] overflow-hidden bg-background' : 'min-h-screen overflow-x-hidden bg-background pattern-islamic pb-36'}
      style={{ backgroundColor: appSettings.backgroundColor }}
    >
      {!isMushafMode && (
        <Header 
          showBackButton 
          onBack={handleGoHome}
          onAccessibilityToggle={() => setIsAccessibilityMode(!isAccessibilityMode)}
          isAccessibilityMode={isAccessibilityMode}
          isContinuousMode={voiceCommands.isContinuousMode}
          onToggleContinuous={voiceCommands.toggleContinuousMode}
          reciter={appSettings.reciter}
          onReciterChange={appSettings.onReciterChange}
          backgroundColor={appSettings.backgroundColor}
          onBackgroundColorChange={appSettings.onBackgroundColorChange}
          textDisplayStyle={appSettings.textDisplayStyle}
          onTextDisplayStyleChange={appSettings.onTextDisplayStyleChange}
          fontSize={appSettings.fontSize}
          onFontSizeChange={appSettings.onFontSizeChange}
          verseViewMode={appSettings.verseViewMode}
          onVerseViewModeChange={appSettings.onVerseViewModeChange}
        />
      )}

      <main className={isMushafMode ? 'h-[100dvh] overflow-hidden p-0' : 'container mx-auto w-full max-w-full overflow-x-hidden px-3 py-4'}>
        {/* Surah Header */}
        {!isMushafMode && <div className="text-center mb-8 animate-fade-in">
          <div className="inline-block mb-4">
            <div className="surah-badge w-16 h-20 flex items-center justify-center text-primary-foreground font-bold text-lg mx-auto">
              {surah.number}
            </div>
          </div>
          <h2 className="font-amiri text-3xl text-primary mb-2">
            {surah.nameArabic}
          </h2>
          <h3 className="text-xl font-semibold text-foreground mb-1">
            {surah.name}
          </h3>
          <p className="text-muted-foreground">
            {surah.englishName} • {surah.versesCount} versets
          </p>
        </div>}

        {/* Quick Navigation */}
        {!isMushafMode && <div className="max-w-lg mx-auto mb-6 animate-fade-in">
          <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-2">
            <Button type="button" variant="default" className="gap-2" aria-pressed="true">
              <FileText className="h-4 w-4" /> {t('verses')}
            </Button>
            <Button type="button" variant="ghost" className="gap-2" onClick={switchToPages}>
              <BookOpen className="h-4 w-4" /> {t('pages')}
            </Button>
          </div>
          <Button type="button" variant="outline" className="mb-3 w-full gap-2" onClick={() => navigate('/search')}>
            <Search className="h-4 w-4" /> {t('quranSearchTitle')}
          </Button>
          <div className="grid grid-cols-2 gap-3">
            {/* Page Navigation */}
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-foreground">{t('page')}</span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  max="604"
                  placeholder="1-604"
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  className="h-9 text-sm bg-background"
                  aria-label={t('pageNumber')}
                />
                <Button 
                  onClick={() => {
                    const pageNum = parseInt(pageInput);
                    if (pageNum >= 1 && pageNum <= 604) {
                      handleNavigateToPage(pageNum);
                      setPageInput('');
                    } else {
                      toast.error('Numéro de page invalide (1-604)');
                    }
                  }}
                  size="sm"
                  className="px-3"
                >
                  {t('go')}
                </Button>
              </div>
            </div>

            {/* Juz Navigation */}
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-foreground">{t('juz')}</span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  max="30"
                  placeholder="1-30"
                  value={juzInput}
                  onChange={(e) => setJuzInput(e.target.value)}
                  className="h-9 text-sm bg-background"
                  aria-label={t('juzNumber')}
                />
                <Button 
                  onClick={() => {
                    const juzNum = parseInt(juzInput);
                    if (juzNum >= 1 && juzNum <= 30) {
                      handleNavigateToJuz(juzNum);
                      setJuzInput('');
                    } else {
                      toast.error('Numéro de Juz invalide (1-30)');
                    }
                  }}
                  size="sm"
                  className="px-3"
                >
                  {t('go')}
                </Button>
              </div>
            </div>
          </div>
        </div>}

        {/* Riwaya (mode versets) : Hafs / Warsh / Qalun — Tajweed coloré */}
        {!isMushafImageMode && !isMushafMode && (
          <div className="max-w-3xl mx-auto mb-4">
            <div className="bg-card border border-border rounded-xl p-2 grid grid-cols-3 gap-2">
              {([
                { key: 'tajweed', label: 'Hafs', ar: 'حفص' },
                { key: 'warsh-tajweed', label: 'Warsh', ar: 'ورش' },
                { key: 'qalun-tajweed', label: 'Qalun', ar: 'قالون' },
              ] as const).map((r) => {
                const active = appSettings.textDisplayStyle === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => appSettings.onTextDisplayStyleChange(r.key)}
                    aria-pressed={active}
                    className={`py-2 px-2 rounded-lg text-sm font-medium transition-all border ${
                      active
                        ? 'bg-primary text-primary-foreground shadow border-primary'
                        : 'text-muted-foreground hover:bg-muted border-border'
                    }`}
                  >
                    <span className="block">{t.lang === 'ar' ? r.ar : r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}


        {/* Tajweed Legend - shown for all colored Tajweed modes (versets + pages) */}
        {(appSettings.textDisplayStyle === 'tajweed' || 
          appSettings.textDisplayStyle === 'warsh-tajweed' ||
          appSettings.textDisplayStyle === 'qalun-tajweed' ||
          appSettings.textDisplayStyle === 'pages-hafs' ||
          appSettings.textDisplayStyle === 'pages-warsh' ||
          appSettings.textDisplayStyle === 'pages-qalun') && (
          <TajweedLegend />
        )}

        {/* Quranic themes legend — text modes + Hafs/Warsh/Qalun pages (rendu texte thémé). */}
        {!isMushafMode &&
          (!isMushafImageMode ||
            appSettings.textDisplayStyle === 'pages-hafs' ||
            appSettings.textDisplayStyle === 'pages-warsh' ||
            appSettings.textDisplayStyle === 'pages-qalun') && <ThemeLegend />}

        <div className={isMushafMode ? 'mx-auto w-full max-w-3xl' : 'max-w-3xl mx-auto'}>
          {/* Cartouche du titre, au début du texte coranique (au-dessus de la Basmala). */}
          {!isMushafImageMode && !isMushafMode && (
            <div className="text-center mb-4 font-amiri text-4xl md:text-5xl">
              <span className="surah-title-frame surah-title-frame--verse">سورة {surah.nameArabic}</span>
            </div>
          )}
          {/* Bismillah - only show for text modes */}
          {surah.number !== 1 && surah.number !== 9 && !isMushafImageMode && (
            <div className="text-center mb-8 p-6 bg-card rounded-2xl border border-border shadow-soft animate-scale-in">
              <p className="font-amiri text-2xl md:text-3xl text-foreground">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Au nom d'Allah, le Tout Miséricordieux, le Très Miséricordieux
              </p>
            </div>
          )}

          {/* Hafs / Warsh / Qalun pages = rendu texte Tajweed inline (stable, offline, surbrillance précise) */}
          {isMushafImageMode &&
            (appSettings.textDisplayStyle === 'pages-hafs' ||
              appSettings.textDisplayStyle === 'pages-warsh' ||
              appSettings.textDisplayStyle === 'pages-qalun') && (
            <HafsTajweedPageView
              key={`${appSettings.textDisplayStyle}-${num}-${searchParams.get('page') || 'default'}`}
              surahNumber={num}
              verses={verses}
              versesTajweed={
                appSettings.textDisplayStyle === 'pages-warsh'
                  ? warshVerses
                  : appSettings.textDisplayStyle === 'pages-qalun'
                    ? qalunVerses
                    : versesTajweed
              }
              preferProvidedTajweed={
                appSettings.textDisplayStyle === 'pages-warsh' ||
                appSettings.textDisplayStyle === 'pages-qalun'
              }
              riwaya={
                appSettings.textDisplayStyle === 'pages-warsh'
                  ? 'warsh'
                  : appSettings.textDisplayStyle === 'pages-qalun'
                    ? 'qalun'
                    : 'hafs'
              }
              fullPageGroups={fullPageGroups}
              initialPage={searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined}
              onPageChange={setCurrentMushafPage}
              currentVerse={quranAudio.currentVerse}
              isAudioPlaying={quranAudio.isPlaying}
              verseProgress={quranAudio.progress}
              highlightCurrentVerse={audioHighlight && !RECITERS[appSettings.reciter].fullSurah}
              onVerseClick={(vn) => quranAudio.playVerse(vn)}
              onPlayPause={() => (quranAudio.isPlaying ? quranAudio.pause() : handlePlayRequest())}
              onNextVerse={quranAudio.nextVerse}
              onPreviousVerse={quranAudio.previousVerse}
              onPageRequest={handleNavigateToPage}
              onManualPageChange={handleManualMushafPageChange}
              onNavigateToSurah={(s) => navigate(`/surah/${s}`)}
              onNavigateToJuz={handleNavigateToJuz}
              playbackSpeed={quranAudio.playbackSpeed}
              onSpeedChange={quranAudio.changeSpeed}
              onOpenAudioMenu={() => setRecitationMenuOpen(true)}
              onPlayRange={(start, end, loop, repeatCount = 1) => {
                if (start === end) {
                  quranAudio.setRepeatMode(
                    loop || repeatCount > 1 ? 'verse' : 'none',
                    loop ? 0 : repeatCount
                  );
                } else {
                  quranAudio.setRepeatMode('range', loop ? 0 : repeatCount, start, end);
                }
                quranAudio.playVerse(start);
              }}

              audioControls={audioPlayerControls}
              voiceControls={voiceCommandControls}
              settingsControls={mushafSettingsControls}
              onSwitchToVerses={switchToVerses}
              spreadSide={spreadActive ? (currentMushafPage! % 2 === 1 ? 'right' : 'left') : undefined}
              twoPageMode={twoPageMode}
              onToggleTwoPage={isWideScreen ? toggleTwoPageMode : undefined}
            />
          )}
          {spreadActive && companionSurah && companionVerses.length > 0 && (
            <HafsTajweedPageView
              key={`companion-${appSettings.textDisplayStyle}-${companionPage}`}
              isCompanion
              spreadSide={companionPage! % 2 === 1 ? 'right' : 'left'}
              surahNumber={companionSurah}
              verses={companionVerses}
              versesTajweed={{}}
              preferProvidedTajweed={appSettings.textDisplayStyle !== 'pages-hafs'}
              riwaya={
                appSettings.textDisplayStyle === 'pages-warsh'
                  ? 'warsh'
                  : appSettings.textDisplayStyle === 'pages-qalun'
                    ? 'qalun'
                    : 'hafs'
              }
              fullPageGroups={companionGroups}
              initialPage={companionPage!}
              onPageRequest={handleNavigateToPage}
              onNavigateToSurah={(s) => navigate(`/surah/${s}`)}
            />
          )}

          {/* Autres modes Mushaf (vidéos uniquement — Warsh/Qalun scans remplacés par rendu texte) */}
          {/* Mushafs vidéo retirés : tous les modes « pages-* » utilisent le rendu texte Tajweed. */}

          {/* Text-based display modes (Tajweed / Warsh / Qalun). Mushaf page modes must never render VerseCard text. */}
          {!isMushafImageMode && (
            <>
              {/* Loading State */}
              {(isLoadingVerses || isLoadingTextSource) && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <p className="text-muted-foreground">Chargement des versets Tajweed...</p>
                </div>
              )}

              {/* Offline indicator */}
              {isOffline && (
                <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-center py-2 px-4 rounded-lg text-sm mb-4">
                  📴 Mode hors ligne — données en cache
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="text-center py-12">
                  <p className="text-destructive">{error}</p>
                </div>
              )}

              {/* Verses */}
              {!isLoadingVerses && !isLoadingTextSource && !error && (
                <div className="space-y-6">
                  {(() => {
                    const allGroups = versePageGroups;
                    const pageGroups = isPagedVerseView
                      ? allGroups.filter(([p]) => p === versePageNum)
                      : allGroups;

                    return pageGroups.map(([pageNum, pageVerses]) => {
                      const firstVerseOfPage = pageVerses[0].number;
                      const lastVerseOfPage = pageVerses[pageVerses.length - 1].number;
                      const pageText = pageVerses
                        .map((v) => {
                          if (effectiveDisplayStyle === 'warsh-tajweed') return warshVerses[v.number] || v.text;
                          if (effectiveDisplayStyle === 'qalun-tajweed') return qalunVerses[v.number] || v.text;
                          return v.text;
                        })
                        .join(' ');
                      const isEvenPage = pageNum % 2 === 0;
                      const juzNum = getJuzForVerse(num, firstVerseOfPage);

                      return (
                        <section
                          key={pageNum}
                          aria-label={`Page ${pageNum}`}
                          className={`rounded-2xl border-[3px] overflow-hidden shadow-md ${
                            isEvenPage ? 'bg-card border-secondary' : 'bg-muted/30 border-primary'
                          }`}
                        >
                          {/* Page header — sticky breadcrumb + play button */}
                          <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-background/85 backdrop-blur border-b border-border">
                            <nav
                              aria-label="Chemin"
                              className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0"
                            >
                              <span className="font-semibold text-foreground truncate">
                                {surah.name}
                              </span>
                              <span aria-hidden="true">›</span>
                              <span className="whitespace-nowrap">
                                Juz <span className="font-semibold text-foreground">{juzNum}</span>
                              </span>
                              <span aria-hidden="true">›</span>
                              <span className="whitespace-nowrap">
                                <MushafPageBadge page={pageNum} className="font-semibold text-foreground" />
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="whitespace-nowrap">
                                Versets{' '}
                                <span className="font-semibold text-foreground">
                                  {firstVerseOfPage}
                                  {firstVerseOfPage !== lastVerseOfPage ? `–${lastVerseOfPage}` : ''}
                                </span>
                              </span>
                            </nav>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => quranAudio.playVerse(firstVerseOfPage)}
                              className="h-8 gap-1.5 rounded-full shrink-0"
                              aria-label={`Lire la page ${pageNum} depuis le verset ${firstVerseOfPage}`}
                            >
                              <Play className="h-3.5 w-3.5" />
                              <span className="text-xs">{t('listenPage')}</span>
                            </Button>
                          </header>

                          {/* Page body */}
                          <div className="p-3 sm:p-4 space-y-4">
                            <VerseRecorder
                              surahNumber={num}
                              verseNumber={firstVerseOfPage}
                              verseText={pageText}
                              label={`Mémorisation — Page ${pageNum}`}
                              reciter={appSettings.reciter}
                              pageVerses={pageVerses.map((v) => ({
                                number: v.number,
                                text:
                                  effectiveDisplayStyle === 'warsh-tajweed'
                                    ? warshVerses[v.number] || v.text
                                    : effectiveDisplayStyle === 'qalun-tajweed'
                                      ? qalunVerses[v.number] || v.text
                                      : v.text,
                              }))}
                              onHideRangeChange={(range) =>
                                setHidingRange((prev) => {
                                  if (range) return { pageNum, start: range.start, end: range.end };
                                  return prev?.pageNum === pageNum ? null : prev;
                                })
                              }
                            />

                            {pageVerses.map((verse) => (
                              <VerseCard
                                key={verse.number}
                                id={`verse-${verse.number}`}
                                verse={verse}
                                surahNumber={surah.number}
                                isPlaying={quranAudio.isPlaying && !RECITERS[appSettings.reciter].fullSurah && quranAudio.currentVerse === verse.number}
                                isHighlighted={audioHighlight && !RECITERS[appSettings.reciter].fullSurah && quranAudio.currentVerse === verse.number}
                                isLoading={quranAudio.isLoading && quranAudio.currentVerse === verse.number}
                                reciter={appSettings.reciter}
                                textDisplayStyle={effectiveDisplayStyle}
                                fontSize={appSettings.fontSize}
                                tajweedHtml={versesTajweed[verse.number]}
                                warshText={warshVerses[verse.number]}
                                qalunText={qalunVerses[verse.number]}
                                onPlay={() => quranAudio.playVerse(verse.number)}
                                onBookmark={isAuthenticated ? () => handleSaveProgress(verse.number) : undefined}
                                isBookmarked={getSurahProgress(num)?.verse_number === verse.number}
                                /* Masqué pendant la session de mémorisation pour les versets sélectionnés. */
                                hideText={
                                  hidingRange?.pageNum === pageNum &&
                                  verse.number >= hidingRange.start &&
                                  verse.number <= hidingRange.end
                                }
                              />
                            ))}
                          </div>
                        </section>
                      );
                    });
                  })()}

                  {/* Position courante + pagination — mode « page par page » (versets) */}
                  {isPagedVerseView && versePageNum !== null && (
                    <div className="sticky bottom-24 z-20 space-y-1">
                      {/* Indicateur de position clair (riwaya, sourate, page, verset lu) */}
                      <div
                        className="rounded-2xl border border-border bg-background/92 backdrop-blur px-2 py-1 shadow-sm text-[10px] sm:text-xs text-muted-foreground flex flex-wrap items-center justify-center gap-x-2 gap-y-1"
                        aria-live="polite"
                      >
                        <span className="font-semibold text-primary">
                          {effectiveDisplayStyle === 'warsh-tajweed'
                            ? (t.lang === 'ar' ? 'ورش' : 'Warsh')
                            : effectiveDisplayStyle === 'qalun-tajweed'
                              ? (t.lang === 'ar' ? 'قالون' : 'Qalun')
                              : (t.lang === 'ar' ? 'حفص' : 'Hafs')}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate max-w-[38%]">{surah.name}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          <MushafPageBadge page={versePageNum} className="font-semibold text-foreground" />
                        </span>
                        {quranAudio.currentVerse > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>
                              {quranAudio.isPlaying ? '▶ ' : ''}{t('verse')} 
                              <span className="font-semibold text-foreground">{quranAudio.currentVerse}</span>
                            </span>
                          </>
                        )}
                        {playingVersePage !== null && playingVersePage !== versePageNum && (
                          <button
                            type="button"
                            onClick={() => goToVersePage(playingVersePage)}
                            className="underline text-primary font-medium"
                          >
                            {t('resumeReading')} ({t('page')} {playingVersePage})
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-1 rounded-full border border-border bg-background/90 backdrop-blur px-1.5 py-1 shadow-sm">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full h-7 px-2 text-xs shrink-0"
                          onClick={() => {
                            const idx = versePageGroups.findIndex(([p]) => p === versePageNum);
                            if (idx > 0) goToVersePage(versePageGroups[idx - 1][0]);
                            else if (versePageNum > 1) handleNavigateToPage(versePageNum - 1);
                          }}
                          disabled={versePageNum <= 1}
                          aria-label={t('prevPage')}
                        >
                          ‹<span className="hidden sm:inline ml-1">{t('prevPage')}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-full h-7 px-2 text-xs min-w-0"
                          onClick={() => {
                            const group = versePageGroups.find(([p]) => p === versePageNum);
                            if (!group) return;
                            if (quranAudio.repeatSettings.mode === 'range') quranAudio.setRepeatMode('none', 1);
                            quranAudio.playVerse(group[1][0].number);
                          }}
                          aria-label={`Lire la page ${versePageNum}`}
                        >
                          <Play className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">{t('listenPage')}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full h-7 px-2 text-xs shrink-0"
                          onClick={() => {
                            const idx = versePageGroups.findIndex(([p]) => p === versePageNum);
                            if (idx >= 0 && idx < versePageGroups.length - 1)
                              goToVersePage(versePageGroups[idx + 1][0]);
                            else if (versePageNum < 604) handleNavigateToPage(versePageNum + 1);
                          }}
                          disabled={versePageNum >= 604}
                          aria-label={t('nextPage')}
                        >
                          <span className="hidden sm:inline mr-1">{t('nextPage')}</span>›
                        </Button>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Mode Versets : casque et micro intégrés à la barre audio du bas */}
      {!isMushafMode && React.cloneElement(audioPlayerControls, {
        leadingControls: (
          <button
            type="button"
            onClick={() => setRecitationMenuOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
            aria-label={t('audioMenu')}
          >
            <Headphones className="h-4 w-4" />
          </button>
        ),
        trailingControls: (
          <div className="flex h-8 w-8 items-center justify-center overflow-visible [&_button]:!h-8 [&_button]:!w-8 [&_svg]:!h-4 [&_svg]:!w-4">
            {voiceCommandControls}
          </div>
        ),
      })}

      <RecitationMenu
        open={recitationMenuOpen}
        onOpenChange={setRecitationMenuOpen}
        surahNumber={num}
        totalVerses={verses.length || 1}
        isPlaying={quranAudio.isPlaying}
        isLoading={quranAudio.isLoading}
        currentVerse={quranAudio.currentVerse}
        reciter={quranAudio.reciter}
        playbackSpeed={quranAudio.playbackSpeed}
        repeatSettings={quranAudio.repeatSettings}
        repeatPause={quranAudio.repeatPause}
        session={quranAudio.recitationSession}
        highlightEnabled={audioHighlight}
        onHighlightChange={handleAudioHighlightChange}
        onPause={quranAudio.pause}
        onReciterChange={appSettings.onReciterChange}
        onSpeedChange={quranAudio.changeSpeed}
        onStart={handleRecitationStart}
      />
    </div>
  );
};

export default SurahReader;
