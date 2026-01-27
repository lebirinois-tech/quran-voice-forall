import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

interface UseQuranAudioOptions {
  surahNumber: number;
  totalVerses: number;
  onVerseChange?: (verseNumber: number) => void;
}

// Reciter options
export const RECITERS = {
  alafasy: { id: 'ar.alafasy', name: 'Mishary Rashid Alafasy' },
  husary: { id: 'ar.husary', name: 'Mahmoud Khalil Al-Husary' },
  minshawi: { id: 'ar.minshawi', name: 'Mohamed Siddiq El-Minshawi' },
  abdulbasit: { id: 'ar.abdulbasit', name: 'Abdul Basit Abdul Samad' },
} as const;

export type ReciterId = keyof typeof RECITERS;

export type RepeatMode = 'none' | 'verse' | 'range' | 'page';

export interface RepeatSettings {
  mode: RepeatMode;
  count: number; // 0 = infinite
  rangeStart?: number;
  rangeEnd?: number;
}

export const useQuranAudio = ({ 
  surahNumber, 
  totalVerses, 
  onVerseChange 
}: UseQuranAudioOptions) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentVerse, setCurrentVerse] = useState(1);
  const [reciter, setReciter] = useState<ReciterId>('alafasy');
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeatSettings, setRepeatSettings] = useState<RepeatSettings>({ mode: 'none', count: 1 });
  const [currentRepeatCount, setCurrentRepeatCount] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoPlayNextRef = useRef(false);

  // Create audio element once
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.preload = 'auto';
    
    const audio = audioRef.current;
    
    audio.addEventListener('timeupdate', () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    });
    
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });
    
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      autoPlayNextRef.current = true;
    });
    
    audio.addEventListener('error', (e) => {
      console.error('Audio error:', e);
      setIsLoading(false);
      setIsPlaying(false);
      toast.error('Erreur de chargement audio');
    });
    
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Handle auto-play next verse with repeat logic
  useEffect(() => {
    if (autoPlayNextRef.current && !isPlaying) {
      autoPlayNextRef.current = false;
      
      const { mode, count, rangeStart, rangeEnd } = repeatSettings;
      
      // Handle repeat modes
      if (mode === 'verse') {
        // Repeat current verse
        const shouldRepeat = count === 0 || currentRepeatCount < count - 1;
        if (shouldRepeat) {
          setCurrentRepeatCount(prev => prev + 1);
          setTimeout(() => playVerse(currentVerse), 300);
          return;
        } else {
          setCurrentRepeatCount(0);
          // Move to next verse after repeat is done
          if (currentVerse < totalVerses) {
            const nextVerse = currentVerse + 1;
            setCurrentVerse(nextVerse);
            onVerseChange?.(nextVerse);
            setTimeout(() => playVerse(nextVerse), 300);
            return;
          }
        }
      } else if (mode === 'range' && rangeStart !== undefined && rangeEnd !== undefined) {
        // Repeat range of verses
        if (currentVerse < rangeEnd) {
          const nextVerse = currentVerse + 1;
          setCurrentVerse(nextVerse);
          onVerseChange?.(nextVerse);
          setTimeout(() => playVerse(nextVerse), 300);
          return;
        } else {
          // End of range, check if we should repeat
          const shouldRepeat = count === 0 || currentRepeatCount < count - 1;
          if (shouldRepeat) {
            setCurrentRepeatCount(prev => prev + 1);
            setCurrentVerse(rangeStart);
            onVerseChange?.(rangeStart);
            setTimeout(() => playVerse(rangeStart), 300);
            return;
          } else {
            setCurrentRepeatCount(0);
            toast.success('Fin de la répétition');
          }
        }
      } else {
        // Normal playback (no repeat or page mode continues normally)
        if (currentVerse < totalVerses) {
          const nextVerse = currentVerse + 1;
          setCurrentVerse(nextVerse);
          onVerseChange?.(nextVerse);
          setTimeout(() => playVerse(nextVerse), 300);
        } else {
          toast.success('Fin de la sourate');
        }
      }
    }
  }, [isPlaying, currentVerse, totalVerses, onVerseChange, repeatSettings, currentRepeatCount]);

  const getAudioUrl = useCallback((surah: number, verse: number, reciterId: ReciterId) => {
    const edition = RECITERS[reciterId].id;
    return `https://api.alquran.cloud/v1/ayah/${surah}:${verse}/${edition}`;
  }, []);

  const playVerse = useCallback(async (verseNumber: number) => {
    if (!audioRef.current) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch(getAudioUrl(surahNumber, verseNumber, reciter));
      const data = await response.json();
      
      if (data.code === 200 && data.data?.audio) {
        audioRef.current.src = data.data.audio;
        await audioRef.current.play();
        setIsPlaying(true);
        setCurrentVerse(verseNumber);
        onVerseChange?.(verseNumber);
      } else {
        throw new Error('Audio not available');
      }
    } catch (error) {
      console.error('Error loading audio:', error);
      toast.error('Impossible de charger l\'audio');
    } finally {
      setIsLoading(false);
    }
  }, [surahNumber, reciter, getAudioUrl, onVerseChange]);

  const play = useCallback(() => {
    if (audioRef.current?.src) {
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      playVerse(currentVerse);
    }
  }, [currentVerse, playVerse]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const nextVerse = useCallback(() => {
    if (currentVerse < totalVerses) {
      const next = currentVerse + 1;
      setCurrentVerse(next);
      onVerseChange?.(next);
      if (isPlaying || audioRef.current?.src) {
        playVerse(next);
      }
    }
  }, [currentVerse, totalVerses, isPlaying, playVerse, onVerseChange]);

  const previousVerse = useCallback(() => {
    if (currentVerse > 1) {
      const prev = currentVerse - 1;
      setCurrentVerse(prev);
      onVerseChange?.(prev);
      if (isPlaying || audioRef.current?.src) {
        playVerse(prev);
      }
    }
  }, [currentVerse, isPlaying, playVerse, onVerseChange]);

  const goToVerse = useCallback((verseNumber: number) => {
    if (verseNumber >= 1 && verseNumber <= totalVerses) {
      setCurrentVerse(verseNumber);
      onVerseChange?.(verseNumber);
    }
  }, [totalVerses, onVerseChange]);

  const changeReciter = useCallback((newReciter: ReciterId) => {
    setReciter(newReciter);
    toast.success(`Récitateur: ${RECITERS[newReciter].name}`);
    // If currently playing, restart with new reciter
    if (isPlaying) {
      pause();
      setTimeout(() => playVerse(currentVerse), 100);
    }
  }, [isPlaying, pause, playVerse, currentVerse]);

  const seek = useCallback((percentage: number) => {
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = (percentage / 100) * audioRef.current.duration;
    }
  }, []);

  const setRepeatMode = useCallback((mode: RepeatMode, count: number = 1, rangeStart?: number, rangeEnd?: number) => {
    setRepeatSettings({ mode, count, rangeStart, rangeEnd });
    setCurrentRepeatCount(0);
    
    if (mode === 'none') {
      toast.info('Répétition désactivée');
    } else if (mode === 'verse') {
      toast.success(`Répétition du verset: ${count === 0 ? '∞' : count}x`);
    } else if (mode === 'range' && rangeStart && rangeEnd) {
      toast.success(`Répétition versets ${rangeStart}-${rangeEnd}: ${count === 0 ? '∞' : count}x`);
    }
  }, []);

  const toggleRepeatVerse = useCallback(() => {
    if (repeatSettings.mode === 'verse') {
      setRepeatMode('none');
    } else {
      setRepeatMode('verse', 3); // Default: repeat 3 times
    }
  }, [repeatSettings.mode, setRepeatMode]);

  return {
    isPlaying,
    isLoading,
    currentVerse,
    reciter,
    progress,
    duration,
    repeatSettings,
    currentRepeatCount,
    play,
    pause,
    togglePlayPause,
    nextVerse,
    previousVerse,
    goToVerse,
    playVerse,
    changeReciter,
    seek,
    setCurrentVerse,
    setRepeatMode,
    toggleRepeatVerse,
  };
};
