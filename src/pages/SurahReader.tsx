import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { VerseCard } from '@/components/VerseCard';
import { MushafPageViewer } from '@/components/MushafPageViewer';
import { AudioPlayer } from '@/components/AudioPlayer';
import { VoiceCommandButton } from '@/components/VoiceCommandButton';
import { TajweedLegend } from '@/components/TajweedLegend';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { useQuranAudio } from '@/hooks/useQuranAudio';
import { useQuranData } from '@/hooks/useQuranData';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useWarshData } from '@/hooks/useWarshData';
import { useAuth } from '@/hooks/useAuth';
import { useReadingProgress } from '@/hooks/useReadingProgress';
import { surahs, Surah, juzMapping, getVersePage } from '@/data/surahs';
import { toast } from 'sonner';
import { Loader2, FileText, Layers } from 'lucide-react';
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

const SurahReader = () => {
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
  const { warshVerses } = useWarshData(num, appSettings.textDisplayStyle === 'warsh-tajweed');

  const quranAudio = useQuranAudio({
    surahNumber: num,
    totalVerses: verses.length || 1,
    reciter: appSettings.reciter,
    onVerseChange: (verseNum) => {
      // Scroll to the verse
      const verseElement = document.getElementById(`verse-${verseNum}`);
      if (verseElement) {
        verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
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
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('ring-2', 'ring-primary');
        setTimeout(() => el.classList.remove('ring-2', 'ring-primary'), 3000);
      } else if (attempts < 10) {
        setTimeout(() => scrollToElement(id, attempts + 1), 300);
      }
    };
    
    if (verseParam) {
      scrollToElement(`verse-${parseInt(verseParam)}`);
    } else if (pageParam && !appSettings.textDisplayStyle.startsWith('mushaf-') && verses.length > 0) {
      const targetPage = parseInt(pageParam);
      const targetVerse = verses.find(v => {
        const versePage = v.page ?? getVersePage(num, v.number, verses.length);
        return versePage >= targetPage;
      });
      if (targetVerse) {
        scrollToElement(`verse-${targetVerse.number}`);
      }
    }
  }, [searchParams, verses, appSettings.textDisplayStyle, num]);

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

  const handleNavigateToPage = (pageNum: number) => {
    const targetSurah = getSurahForPage(pageNum);
    navigate(`/surah/${targetSurah}?page=${pageNum}`);
    toast.success(`Navigation vers page ${pageNum} (Sourate ${targetSurah})`);
  };

  const handleNavigateToJuz = (juzNum: number) => {
    const juz = juzMapping[juzNum];
    if (juz) {
      navigate(`/surah/${juz.surah}`);
      toast.success(`Navigation vers Juz ${juzNum} - ${juz.name}`);
    }
  };

  const isMushafMode = appSettings.textDisplayStyle.startsWith('mushaf-');

  // Compute verse range for the current Mushaf page using real API page data
  const currentPageVerseRange = useMemo(() => {
    if (!isMushafMode || !currentMushafPage || verses.length === 0) return null;
    const pageVerses = verses.filter(v => v.page === currentMushafPage);
    if (pageVerses.length === 0) return null;
    return { first: pageVerses[0].number, last: pageVerses[pageVerses.length - 1].number };
  }, [isMushafMode, currentMushafPage, verses]);

  const handlePlayRequest = useCallback(() => {
    if (isMushafMode && currentPageVerseRange) {
      quranAudio.playVerse(currentPageVerseRange.first);
      quranAudio.setRepeatMode('range', 1, currentPageVerseRange.first, currentPageVerseRange.last);
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

  return (
    <div className="min-h-screen bg-background pattern-islamic pb-32" style={{ backgroundColor: appSettings.backgroundColor }}>
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
                  Go
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Tajweed Legend - shown for all colored Tajweed modes */}
        {(appSettings.textDisplayStyle === 'tajweed' || 
          appSettings.textDisplayStyle === 'warsh-tajweed' ||
          appSettings.textDisplayStyle === 'mushaf-hafs' ||
          appSettings.textDisplayStyle === 'mushaf-warsh-tajweed' ||
          appSettings.textDisplayStyle === 'mushaf-qalun') && (
          <TajweedLegend />
        )}

        <div className="max-w-3xl mx-auto">
          {/* Bismillah - only show for text modes */}
          {surah.number !== 1 && surah.number !== 9 && 
           appSettings.textDisplayStyle !== 'mushaf-hafs' && 
           appSettings.textDisplayStyle !== 'mushaf-warsh' &&
           appSettings.textDisplayStyle !== 'mushaf-warsh-tajweed' &&
           appSettings.textDisplayStyle !== 'mushaf-qalun' && (
            <div className="text-center mb-8 p-6 bg-card rounded-2xl border border-border shadow-soft animate-scale-in">
              <p className="font-amiri text-2xl md:text-3xl text-foreground">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Au nom d'Allah, le Tout Miséricordieux, le Très Miséricordieux
              </p>
            </div>
          )}

          {/* Mushaf Image Viewer Mode */}
          {(appSettings.textDisplayStyle === 'mushaf-hafs' || 
            appSettings.textDisplayStyle === 'mushaf-warsh' ||
            appSettings.textDisplayStyle === 'mushaf-warsh-tajweed' ||
            appSettings.textDisplayStyle === 'mushaf-qalun') && (
            <MushafPageViewer
              key={`mushaf-${num}-${searchParams.get('page') || 'default'}`}
              surahNumber={num}
              totalVerses={verses.length || surah.versesCount}
              initialPage={searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined}
              onPageChange={setCurrentMushafPage}
              mushafType={
                appSettings.textDisplayStyle === 'mushaf-hafs' ? 'hafs' : 
                appSettings.textDisplayStyle === 'mushaf-warsh-tajweed' ? 'warsh-tajweed' :
                appSettings.textDisplayStyle === 'mushaf-qalun' ? 'qalun' : 'warsh'
              }
            />
          )}

          {/* Text-based display modes (Tajweed / Simple / Warsh text) */}
          {appSettings.textDisplayStyle !== 'mushaf-hafs' && 
           appSettings.textDisplayStyle !== 'mushaf-warsh' &&
           appSettings.textDisplayStyle !== 'mushaf-warsh-tajweed' &&
           appSettings.textDisplayStyle !== 'mushaf-qalun' && (
            <>
              {/* Loading State */}
              {isLoadingVerses && (
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
                      reciter={appSettings.reciter}
                      textDisplayStyle={appSettings.textDisplayStyle}
                      fontSize={appSettings.fontSize}
                      tajweedHtml={versesTajweed[verse.number]}
                      warshText={warshVerses[verse.number]}
                      onPlay={() => quranAudio.playVerse(verse.number)}
                      onBookmark={isAuthenticated ? () => handleSaveProgress(verse.number) : undefined}
                      isBookmarked={getSurahProgress(num)?.verse_number === verse.number}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Voice Command Button */}
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

      {/* Audio Player - hidden in Mushaf mode (MushafPageViewer has its own page audio) */}
      {!isMushafMode && (
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
          surahName={`${surah.name} - ${surah.nameArabic}`}
        />
      )}
    </div>
  );
};

export default SurahReader;
