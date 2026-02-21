import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { getCachedAudioUrl } from './useAudioCache';

// Interface moved inside hook for better organization

// Reciter options organized by Qira'at (reading style)
export const QIRAAT_LABELS = {
  hafs: 'Hafs (حفص)',
  warsh: 'Warsh (ورش)',
  qalun: 'Qalun (قالون)',
  doori: 'Al-Doori (الدوري)',
} as const;

export type QiraatId = keyof typeof QIRAAT_LABELS;

export interface ReciterInfo {
  id: string;
  name: string;
  qiraat: QiraatId;
}

export interface ReciterInfo {
  id: string;
  name: string;
  qiraat: QiraatId;
  quranicAudioId?: number; // ID for quranicaudio.com download links
}

export const RECITERS: Record<string, ReciterInfo> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // HAFS (حفص عن عاصم) - The most widely used reading
  // ═══════════════════════════════════════════════════════════════════════════
  alafasy: { id: 'ar.alafasy', name: 'Mishary Rashid Alafasy', qiraat: 'hafs', quranicAudioId: 7 },
  husary: { id: 'ar.husary', name: 'Mahmoud Khalil Al-Husary', qiraat: 'hafs', quranicAudioId: 18 },
  minshawi: { id: 'ar.minshawi', name: 'Mohamed Siddiq El-Minshawi', qiraat: 'hafs', quranicAudioId: 21 },
  abdulbasit: { id: 'ar.abdulbasitmujawwad', name: 'Abdul Basit Abdul Samad', qiraat: 'hafs', quranicAudioId: 1 },
  sudais: { id: 'ar.abdurrahmaansudais', name: 'Abdurrahman As-Sudais', qiraat: 'hafs', quranicAudioId: 10 },
  shuraym: { id: 'ar.saulodshurem', name: 'Saud Al-Shuraym', qiraat: 'hafs', quranicAudioId: 11 },
  mahermuaiqly: { id: 'ar.maaboraliqli', name: 'Maher Al-Muaiqly', qiraat: 'hafs', quranicAudioId: 6 },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // WARSH (ورش عن نافع) - Popular in North & West Africa
  // Using everyayah.com which has proper Warsh recordings
  // Available: Ibrahim Al-Dosary (complete), Yassin Al-Jazaery (complete)
  // Note: Al-Husary Warsh is NOT available on everyayah.com
  // ═══════════════════════════════════════════════════════════════════════════
  ibrahimDosaryWarsh: { id: 'warsh_ibrahim_dosary', name: 'Ibrahim Al-Dosary (Warsh)', qiraat: 'warsh', quranicAudioId: 35 },
  yassinJazaeryWarsh: { id: 'warsh_yassin_jazaery', name: 'Yassin Al-Jazaery (Warsh)', qiraat: 'warsh', quranicAudioId: 35 },
} as const;

export type ReciterId = keyof typeof RECITERS;

export type RepeatMode = 'none' | 'verse' | 'range' | 'page';

export interface RepeatSettings {
  mode: RepeatMode;
  count: number; // 0 = infinite
  rangeStart?: number;
  rangeEnd?: number;
}

interface UseQuranAudioOptions {
  surahNumber: number;
  totalVerses: number;
  reciter?: ReciterId;
  onVerseChange?: (verseNumber: number) => void;
}

export const useQuranAudio = ({ 
  surahNumber, 
  totalVerses, 
  reciter: externalReciter = 'alafasy',
  onVerseChange 
}: UseQuranAudioOptions) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentVerse, setCurrentVerse] = useState(1);
  const [reciter, setReciter] = useState<ReciterId>(externalReciter);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeatSettings, setRepeatSettings] = useState<RepeatSettings>({ mode: 'none', count: 1 });
  const [currentRepeatCount, setCurrentRepeatCount] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Sync reciter with external prop
  useEffect(() => {
    setReciter(externalReciter);
  }, [externalReciter]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoPlayNextRef = useRef(false);

  // Setup audio event handlers
  const setupAudioListeners = useCallback((audio: HTMLAudioElement) => {
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
    
    audio.addEventListener('error', () => {
      if (!audio.src || audio.src === '' || audio.src === window.location.href) return;
      console.error('Audio error for src:', audio.src);
      setIsLoading(false);
      setIsPlaying(false);
      toast.error('Erreur de chargement audio');
    });
  }, []);

  // Create initial audio element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    setupAudioListeners(audio);
    audioRef.current = audio;
    
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [setupAudioListeners]);

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

  // Helper to format verse number for everyayah.com (e.g., 001, 002, 123)
  const formatVerseNumber = (num: number) => num.toString().padStart(3, '0');
  const formatSurahNumber = (num: number) => num.toString().padStart(3, '0');

  // everyayah.com folder names for each reciter
  const EVERYAYAH_FOLDERS: Record<string, string> = {
    alafasy: 'Alafasy_128kbps',
    husary: 'Husary_128kbps',
    minshawi: 'Minshawy_Mujawwad_192kbps',
    abdulbasit: 'Abdul_Basit_Mujawwad_128kbps',
    sudais: 'Abdurrahmaan_As-Sudais_192kbps',
    shuraym: 'Saood_Ash-Shuraym_128kbps',
    mahermuaiqly: 'MauroAl_Muaiqely_128kbps',
    ibrahimDosaryWarsh: 'warsh/warsh_ibrahim_aldosary_128kbps',
    yassinJazaeryWarsh: 'Yassin_Al-Jazaery_64kbps',
  };

  const getAudioUrl = useCallback((surah: number, verse: number, reciterId: ReciterId) => {
    const surahStr = formatSurahNumber(surah);
    const verseStr = formatVerseNumber(verse);
    const folder = EVERYAYAH_FOLDERS[reciterId];
    if (folder) {
      return `https://everyayah.com/data/${folder}/${surahStr}${verseStr}.mp3`;
    }
    // Fallback to Alafasy
    return `https://everyayah.com/data/Alafasy_128kbps/${surahStr}${verseStr}.mp3`;
  }, []);

  const playAudioFromUrl = useCallback((audio: HTMLAudioElement, url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const onCanPlay = () => {
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('error', onError);
        audio.play().then(resolve).catch(reject);
      };
      const onError = () => {
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('error', onError);
        reject(new Error('Audio load failed'));
      };
      audio.addEventListener('canplay', onCanPlay);
      audio.addEventListener('error', onError);
      audio.src = url;
      audio.load();
    });
  }, []);

  const playVerse = useCallback(async (verseNumber: number) => {
    setIsLoading(true);
    
    try {
      // Create a fresh audio element to avoid corrupted state
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      const newAudio = new Audio();
      newAudio.preload = 'auto';
      setupAudioListeners(newAudio);
      audioRef.current = newAudio;
      newAudio.playbackRate = playbackSpeed;

      // Check localStorage for cached audio URL (offline support)
      const cachedUrl = getCachedAudioUrl(reciter, surahNumber, verseNumber);
      if (cachedUrl) {
        await playAudioFromUrl(newAudio, cachedUrl);
        setIsPlaying(true);
        setCurrentVerse(verseNumber);
        onVerseChange?.(verseNumber);
        return;
      }

      // Use everyayah.com directly for all reciters (cdn.islamic.network is unreliable)
      const audioUrl = getAudioUrl(surahNumber, verseNumber, reciter);
      await playAudioFromUrl(newAudio, audioUrl);
      setIsPlaying(true);
      setCurrentVerse(verseNumber);
      onVerseChange?.(verseNumber);
    } catch (error) {
      console.error('Error loading audio:', error);
      toast.error('Impossible de charger l\'audio');
    } finally {
      setIsLoading(false);
    }
  }, [surahNumber, reciter, getAudioUrl, onVerseChange, playbackSpeed, setupAudioListeners, playAudioFromUrl]);

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
    toast.success(`Récitateur: ${RECITERS[newReciter]?.name ?? newReciter}`);
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

  const changeSpeed = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
    toast.success(`Vitesse: ${speed}x`);
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
    playbackSpeed,
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
    changeSpeed,
  };
};
