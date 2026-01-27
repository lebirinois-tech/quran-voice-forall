import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { VerseCard } from '@/components/VerseCard';
import { AudioPlayer } from '@/components/AudioPlayer';
import { VoiceCommandButton } from '@/components/VoiceCommandButton';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { surahs, getSurahVerses, Surah, Verse } from '@/data/surahs';
import { toast } from 'sonner';

const SurahReader = () => {
  const navigate = useNavigate();
  const { surahNumber } = useParams<{ surahNumber: string }>();
  const [surah, setSurah] = useState<Surah | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVerse, setCurrentVerse] = useState(1);
  const [isAccessibilityMode, setIsAccessibilityMode] = useState(false);

  useEffect(() => {
    const num = parseInt(surahNumber || '1');
    const foundSurah = surahs.find(s => s.number === num);
    if (foundSurah) {
      setSurah(foundSurah);
      setVerses(getSurahVerses(num));
    }
  }, [surahNumber]);

  const handlePlay = () => {
    setIsPlaying(true);
    toast.success('Lecture démarrée');
  };

  const handlePause = () => {
    setIsPlaying(false);
    toast.info('Lecture en pause');
  };

  const handleNext = () => {
    if (currentVerse < verses.length) {
      setCurrentVerse(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentVerse > 1) {
      setCurrentVerse(prev => prev - 1);
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleNavigateToSurah = (num: number) => {
    navigate(`/surah/${num}`);
    toast.success(`Navigation vers sourate ${num}`);
  };

  const voiceCommands = useVoiceCommands({
    onPlay: handlePlay,
    onPause: handlePause,
    onNextVerse: handleNext,
    onPreviousVerse: handlePrevious,
    onGoHome: handleGoHome,
    onNavigateToSurah: handleNavigateToSurah,
    onReadVerse: (verseNum) => {
      if (verseNum >= 1 && verseNum <= verses.length) {
        setCurrentVerse(verseNum);
        toast.success(`Verset ${verseNum} sélectionné`);
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
              verse={verse}
              surahNumber={surah.number}
              isPlaying={isPlaying && currentVerse === verse.number}
              isHighlighted={currentVerse === verse.number}
              onPlay={() => {
                setCurrentVerse(verse.number);
                setIsPlaying(true);
              }}
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
        isPlaying={isPlaying}
        currentVerse={currentVerse}
        totalVerses={verses.length}
        onPlay={handlePlay}
        onPause={handlePause}
        onNext={handleNext}
        onPrevious={handlePrevious}
        surahName={`${surah.name} - ${surah.nameArabic}`}
      />
    </div>
  );
};

export default SurahReader;
