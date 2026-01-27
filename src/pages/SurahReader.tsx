import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { VerseCard } from '@/components/VerseCard';
import { AudioPlayer } from '@/components/AudioPlayer';
import { VoiceCommandButton } from '@/components/VoiceCommandButton';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { useQuranAudio } from '@/hooks/useQuranAudio';
import { surahs, getSurahVerses, Surah, Verse } from '@/data/surahs';
import { toast } from 'sonner';

const SurahReader = () => {
  const navigate = useNavigate();
  const { surahNumber } = useParams<{ surahNumber: string }>();
  const [surah, setSurah] = useState<Surah | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [isAccessibilityMode, setIsAccessibilityMode] = useState(false);

  const num = parseInt(surahNumber || '1');

  useEffect(() => {
    const foundSurah = surahs.find(s => s.number === num);
    if (foundSurah) {
      setSurah(foundSurah);
      setVerses(getSurahVerses(num));
    }
  }, [num]);

  const quranAudio = useQuranAudio({
    surahNumber: num,
    totalVerses: verses.length || 1,
    onVerseChange: (verseNum) => {
      // Scroll to the verse
      const verseElement = document.getElementById(`verse-${verseNum}`);
      if (verseElement) {
        verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
  });

  const handleGoHome = () => {
    navigate('/');
  };

  const handleNavigateToSurah = (surahNum: number) => {
    navigate(`/surah/${surahNum}`);
    toast.success(`Navigation vers sourate ${surahNum}`);
  };

  const voiceCommands = useVoiceCommands({
    onPlay: () => {
      quranAudio.play();
      toast.success('Lecture démarrée');
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
    onReadVerse: (verseNum) => {
      if (verseNum >= 1 && verseNum <= verses.length) {
        quranAudio.playVerse(verseNum);
        toast.success(`Lecture du verset ${verseNum}`);
      }
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

        {/* Verses */}
        <div className="space-y-4 max-w-3xl mx-auto">
          {verses.map((verse) => (
            <VerseCard
              key={verse.number}
              id={`verse-${verse.number}`}
              verse={verse}
              surahNumber={surah.number}
              isPlaying={quranAudio.isPlaying && quranAudio.currentVerse === verse.number}
              isHighlighted={quranAudio.currentVerse === verse.number}
              isLoading={quranAudio.isLoading && quranAudio.currentVerse === verse.number}
              onPlay={() => quranAudio.playVerse(verse.number)}
            />
          ))}
        </div>
      </main>

      {/* Voice Command Button */}
      <div className="fixed bottom-28 right-4 z-50">
        <VoiceCommandButton
          isListening={voiceCommands.isListening}
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
        totalVerses={verses.length}
        progress={quranAudio.progress}
        reciter={quranAudio.reciter}
        onPlay={quranAudio.play}
        onPause={quranAudio.pause}
        onNext={quranAudio.nextVerse}
        onPrevious={quranAudio.previousVerse}
        onReciterChange={quranAudio.changeReciter}
        onSeek={quranAudio.seek}
        surahName={`${surah.name} - ${surah.nameArabic}`}
      />
    </div>
  );
};

export default SurahReader;
