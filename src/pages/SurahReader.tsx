import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { VerseCard } from '@/components/VerseCard';
import { AudioPlayer } from '@/components/AudioPlayer';
import { VoiceCommandButton } from '@/components/VoiceCommandButton';
import { MushafPageView } from '@/components/MushafPageView';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { useQuranAudio } from '@/hooks/useQuranAudio';
import { useQuranData } from '@/hooks/useQuranData';
import { surahs, Surah, juzMapping, surahPageStart, getVersePage } from '@/data/surahs';
import { toast } from 'sonner';
import { Loader2, FileText, Layers, BookOpen, AlignLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

type ViewMode = 'text' | 'mushaf';

type LocationState = {
  autoplayFromPage?: number;
  autoplayViewMode?: ViewMode;
} | null;

// (page start -> surah) mapping
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

const SurahReader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { surahNumber } = useParams<{ surahNumber: string }>();
  const [surah, setSurah] = useState<Surah | null>(null);
  const [isAccessibilityMode, setIsAccessibilityMode] = useState(false);
  const [pageInput, setPageInput] = useState('');
  const [juzInput, setJuzInput] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('text');
  const [mushafPage, setMushafPage] = useState(1);
  const [lastSyncedVerse, setLastSyncedVerse] = useState<number | null>(null);

  const num = parseInt(surahNumber || '1');

  const { autoplayFromPage, autoplayViewMode } = useMemo(() => {
    const state = (location.state as LocationState) || null;
    return {
      autoplayFromPage: state?.autoplayFromPage,
      autoplayViewMode: state?.autoplayViewMode,
    };
  }, [location.state]);

  const getSurahForPage = useCallback((pageNum: number) => {
    let targetSurah = 1;
    for (const [page, s] of PAGE_START_MAP) {
      if (page <= pageNum) targetSurah = s;
      else break;
    }
    return targetSurah;
  }, []);

  const getVerseForPageInSurah = useCallback((page: number, totalVerses: number) => {
    const startPage = surahPageStart[num] || 1;
    const nextSurahStart = surahPageStart[num + 1] || 605;
    const pagesInSurah = Math.max(1, nextSurahStart - startPage);
    const clampedPage = Math.min(Math.max(page, startPage), nextSurahStart - 1);

    // Approximation: map page progress within the surah to verse index.
    const pageProgress = (clampedPage - startPage) / Math.max(1, pagesInSurah);
    const estimatedVerse = Math.max(1, Math.floor(pageProgress * totalVerses) + 1);
    return Math.min(estimatedVerse, totalVerses);
  }, [num]);

  // Fetch surah metadata and set initial Mushaf page
  useEffect(() => {
    const foundSurah = surahs.find(s => s.number === num);
    if (foundSurah) {
      setSurah(foundSurah);

      if (autoplayViewMode === 'mushaf') {
        setViewMode('mushaf');
      }

      // Set initial Mushaf page based on surah, but preserve requested page if we navigated here from a page.
      const startPage = surahPageStart[num] || 1;
      const initialPage =
        typeof autoplayFromPage === 'number' && getSurahForPage(autoplayFromPage) === num
          ? autoplayFromPage
          : startPage;
      setMushafPage(initialPage);
    }
  }, [num, autoplayFromPage, autoplayViewMode, getSurahForPage]);

  // Fetch verses with Tajweed from API
  const { verses, isLoading: isLoadingVerses, error } = useQuranData(num);

  const quranAudio = useQuranAudio({
    surahNumber: num,
    totalVerses: verses.length || 1,
    onVerseChange: (verseNum) => {
      // Scroll to the verse in text mode
      const verseElement = document.getElementById(`verse-${verseNum}`);
      if (verseElement) {
        verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
  });

  const clearAutoplayState = useCallback(() => {
    if (autoplayFromPage !== undefined || autoplayViewMode !== undefined) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [autoplayFromPage, autoplayViewMode, navigate, location.pathname]);

  const handlePlayRequest = useCallback(() => {
    if (viewMode !== 'mushaf' || verses.length === 0) {
      quranAudio.play();
      toast.success('Lecture démarrée');
      return;
    }

    const targetSurah = getSurahForPage(mushafPage);
    if (targetSurah !== num) {
      // La page affichée appartient à une autre sourate: on y navigue et on auto-démarre.
      navigate(`/surah/${targetSurah}`, {
        state: { autoplayFromPage: mushafPage, autoplayViewMode: 'mushaf' },
      });
      toast.info(`Navigation vers la sourate ${targetSurah} (page ${mushafPage})`);
      return;
    }

    const verseToPlay = getVerseForPageInSurah(mushafPage, verses.length);
    quranAudio.playVerse(verseToPlay);
    toast.success(`Lecture depuis la page ${mushafPage}`);
  }, [viewMode, verses.length, getSurahForPage, mushafPage, num, navigate, quranAudio, getVerseForPageInSurah]);

  // Auto-start after navigation from a Mushaf page (so it doesn't stop at end of current surah like /surah/1 page 2).
  useEffect(() => {
    if (viewMode !== 'mushaf') return;
    if (typeof autoplayFromPage !== 'number') return;
    if (verses.length === 0) return;
    if (getSurahForPage(autoplayFromPage) !== num) return;

    const verseToPlay = getVerseForPageInSurah(autoplayFromPage, verses.length);
    quranAudio.playVerse(verseToPlay);
    clearAutoplayState();
  }, [autoplayFromPage, verses.length, num, viewMode, getSurahForPage, getVerseForPageInSurah, quranAudio, clearAutoplayState]);

  // Auto-sync Mushaf page only when verse CHANGES during playback (not on play start)
  useEffect(() => {
    if (quranAudio.isPlaying && verses.length > 0 && viewMode === 'mushaf') {
      // Only sync if the verse has changed (not on initial play)
      if (lastSyncedVerse !== null && quranAudio.currentVerse !== lastSyncedVerse) {
        const newPage = getVersePage(num, quranAudio.currentVerse, verses.length);
        if (newPage !== mushafPage && newPage >= 1 && newPage <= 604) {
          setMushafPage(newPage);
        }
      }
      setLastSyncedVerse(quranAudio.currentVerse);
    }
    
    // Reset sync tracking when playback stops
    if (!quranAudio.isPlaying) {
      setLastSyncedVerse(null);
    }
  }, [quranAudio.currentVerse, quranAudio.isPlaying, verses.length, num, viewMode, mushafPage, lastSyncedVerse]);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleNavigateToSurah = (surahNum: number) => {
    navigate(`/surah/${surahNum}`);
    toast.success(`Navigation vers sourate ${surahNum}`);
  };

  const handleNavigateToPage = (pageNum: number) => {
    const targetSurah = getSurahForPage(pageNum);
    
    navigate(`/surah/${targetSurah}`);
    toast.success(`Navigation vers page ${pageNum} (Sourate ${targetSurah})`);
  };

  const handleNavigateToJuz = (juzNum: number) => {
    const juz = juzMapping[juzNum];
    if (juz) {
      navigate(`/surah/${juz.surah}`);
      toast.success(`Navigation vers Juz ${juzNum} - ${juz.name}`);
    }
  };

  const voiceCommands = useVoiceCommands({
    onPlay: () => {
      handlePlayRequest();
    },
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

  return (
    <div className="min-h-screen bg-background pattern-islamic pb-32">
      <Header 
        showBackButton 
        onBack={handleGoHome}
        onAccessibilityToggle={() => setIsAccessibilityMode(!isAccessibilityMode)}
        isAccessibilityMode={isAccessibilityMode}
        isContinuousMode={voiceCommands.isContinuousMode}
        onToggleContinuous={voiceCommands.toggleContinuousMode}
      />

      <main className="container mx-auto px-4 py-6">
        {/* Surah Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-block mb-4">
            <div className="surah-badge w-16 h-20 flex items-center justify-center text-primary-foreground font-bold text-lg mx-auto">
              {surah.number}
            </div>
          </div>
          <h2 className="font-amiri text-4xl md:text-5xl text-primary mb-2">
            {surah.nameArabic}
          </h2>
          <h3 className="text-xl font-semibold text-foreground mb-1">
            {surah.name}
          </h3>
          <p className="text-muted-foreground">
            {surah.englishName} • {surah.versesCount} versets
          </p>
        </div>

        {/* Quick Navigation */}
        <div className="max-w-lg mx-auto mb-6 animate-fade-in">
          <div className="grid grid-cols-2 gap-3">
            {/* Page Navigation */}
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-foreground">Page</span>
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
                  aria-label="Numéro de page"
                />
                <Button 
                  onClick={() => {
                    const num = parseInt(pageInput);
                    if (num >= 1 && num <= 604) {
                      handleNavigateToPage(num);
                      setPageInput('');
                    } else {
                      toast.error('Numéro de page invalide (1-604)');
                    }
                  }}
                  size="sm"
                  className="px-3"
                >
                  Go
                </Button>
              </div>
            </div>

            {/* Juz Navigation */}
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-foreground">Juz</span>
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
                  aria-label="Numéro de Juz"
                />
                <Button 
                  onClick={() => {
                    const num = parseInt(juzInput);
                    if (num >= 1 && num <= 30) {
                      handleNavigateToJuz(num);
                      setJuzInput('');
                    } else {
                      toast.error('Numéro de Juz invalide (1-30)');
                    }
                  }}
                  size="sm"
                  className="px-3"
                >
                  Go
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="max-w-3xl mx-auto mb-6">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'text' | 'mushaf')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-xs mx-auto">
              <TabsTrigger value="text" className="flex items-center gap-2">
                <AlignLeft className="h-4 w-4" />
                Texte
              </TabsTrigger>
              <TabsTrigger value="mushaf" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Mushaf
              </TabsTrigger>
            </TabsList>

            {/* Text View */}
            <TabsContent value="text" className="mt-6">
              {/* Bismillah */}
              {surah.number !== 1 && surah.number !== 9 && (
                <div className="text-center mb-8 p-6 bg-card rounded-2xl border border-border shadow-soft animate-scale-in">
                  <p className="font-amiri text-2xl md:text-3xl text-foreground">
                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Au nom d'Allah, le Tout Miséricordieux, le Très Miséricordieux
                  </p>
                </div>
              )}

              {/* Loading State */}
              {isLoadingVerses && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <p className="text-muted-foreground">Chargement des versets...</p>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="text-center py-12">
                  <p className="text-destructive">{error}</p>
                </div>
              )}

              {/* Verses */}
              {!isLoadingVerses && !error && (
                <div className="space-y-4">
                  {verses.map((verse) => (
                    <VerseCard
                      key={verse.number}
                      id={`verse-${verse.number}`}
                      verse={verse}
                      surahNumber={surah.number}
                      isPlaying={quranAudio.isPlaying && quranAudio.currentVerse === verse.number}
                      isHighlighted={quranAudio.currentVerse === verse.number}
                      isLoading={quranAudio.isLoading && quranAudio.currentVerse === verse.number}
                      reciter={quranAudio.reciter}
                      onPlay={() => quranAudio.playVerse(verse.number)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Mushaf Page View */}
            <TabsContent value="mushaf" className="mt-6">
              <MushafPageView
                initialPage={mushafPage}
                onPageChange={setMushafPage}
                currentVerse={quranAudio.currentVerse}
                isPlaying={quranAudio.isPlaying}
                surahName={surah.name}
                surahNumber={surah.number}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Voice Command Button - simplified without continuous mode toggle */}
      <div className="fixed bottom-28 right-4 z-50">
        <VoiceCommandButton
          isListening={voiceCommands.isListening}
          isContinuousMode={voiceCommands.isContinuousMode}
          isAwaitingCommand={voiceCommands.isAwaitingCommand}
          isSupported={voiceCommands.isSupported}
          onToggle={voiceCommands.toggleListening}
          transcript={voiceCommands.transcript}
        />
      </div>

      {/* Audio Player */}
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
        onReciterChange={quranAudio.changeReciter}
        onSeek={quranAudio.seek}
        onRepeatModeChange={quranAudio.setRepeatMode}
        onSpeedChange={quranAudio.changeSpeed}
        surahName={`${surah.name} - ${surah.nameArabic}`}
      />
    </div>
  );
};

export default SurahReader;
