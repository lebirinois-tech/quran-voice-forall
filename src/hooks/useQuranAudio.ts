import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { getCachedAudioUrl } from './useAudioCache';

// Interface moved inside hook for better organization

// Reciter options organized by Qira'at (reading style)
export const QIRAAT_LABELS = {
  hafs: 'Hafs (حفص)',
  warsh: 'Warsh (ورش)',
  qalun: 'Qalun (قالون)',
} as const;

export type QiraatId = keyof typeof QIRAAT_LABELS;

export interface ReciterInfo {
  id: string;
  name: string;
  nameAr: string;
  qiraat: QiraatId;
  quranicAudioId?: number;
  /** When true, audio is delivered as a single MP3 per surah (no per-verse files). */
  fullSurah?: boolean;
  /** Full-surah MP3 base URL; surah number is appended as 3-digit padded `.mp3`. */
  fullSurahBaseUrl?: string;
  /**
   * Archive.org item where per-verse MP3s are bundled inside one ZIP per surah.
   * URL pattern: `https://archive.org/download/{archiveItem}/{SSS}.zip/{SSSAAA}.mp3`.
   */
  archiveItem?: string;
}

export const RECITERS = {
  // ═══════════════════════════════════════════════════════════════════════════
  // HAFS (حفص عن عاصم) — Mahmoud Khalil Al-Husary (référence mondiale)
  // ═══════════════════════════════════════════════════════════════════════════
  husary: { id: 'ar.husary', name: 'Mahmoud Khalil Al-Husary', nameAr: 'محمود خليل الحصري', qiraat: 'hafs', quranicAudioId: 18 },

  // ═══════════════════════════════════════════════════════════════════════════
  // WARSH (ورش عن نافع)
  // ═══════════════════════════════════════════════════════════════════════════
  ibrahimDosaryWarsh: { id: 'warsh_ibrahim_dosary', name: 'Ibrahim Al-Dosary (Warsh)', nameAr: 'إبراهيم الدوسري (ورش)', qiraat: 'warsh', quranicAudioId: 35 },

  // ═══════════════════════════════════════════════════════════════════════════
  // QALUN (قالون عن نافع)
  // ═══════════════════════════════════════════════════════════════════════════
  husaryQalunPerVerse: {
    id: 'husary_qalun_per_verse',
    name: 'Al-Husary (Qalun – verset par verset)',
    nameAr: 'محمود خليل الحصري (قالون – آية آية)',
    qiraat: 'qalun',
    archiveItem:
      '32kb------6236-ayah--verse-by-verse----quran-----mp3----32kb___by__alhosary---',
  },
} as const satisfies Record<string, ReciterInfo>;

export type ReciterId = keyof typeof RECITERS;

export const RECITER_IDS = Object.keys(RECITERS) as ReciterId[];

export const isReciterId = (value: unknown): value is ReciterId =>
  typeof value === 'string' && value in RECITERS;

export const getSafeReciter = (value: unknown): ReciterId =>
  isReciterId(value) ? value : 'husary';

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

const normalizePlaybackSpeed = (speed: number) => {
  if (!Number.isFinite(speed)) return 1;
  return Math.min(2, Math.max(0.5, speed));
};

const PLAYBACK_SPEED_STORAGE_KEY = 'quran-audio-playback-speed';

const readSavedPlaybackSpeed = () => {
  if (typeof window === 'undefined') return 1;
  return normalizePlaybackSpeed(Number(window.localStorage.getItem(PLAYBACK_SPEED_STORAGE_KEY)));
};

const savePlaybackSpeed = (speed: number) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PLAYBACK_SPEED_STORAGE_KEY, String(normalizePlaybackSpeed(speed)));
};

const applyPlaybackSpeed = (audio: HTMLAudioElement | null, speed: number) => {
  if (!audio) return;
  const normalizedSpeed = normalizePlaybackSpeed(speed);
  try {
    audio.defaultPlaybackRate = normalizedSpeed;
    audio.playbackRate = normalizedSpeed;

    const vendorAudio = audio as HTMLAudioElement & {
      preservesPitch?: boolean;
      webkitPreservesPitch?: boolean;
      mozPreservesPitch?: boolean;
    };
    vendorAudio.preservesPitch = true;
    vendorAudio.webkitPreservesPitch = true;
    vendorAudio.mozPreservesPitch = true;
  } catch (error) {
    console.warn('Impossible de modifier la vitesse audio:', error);
  }
};

const schedulePlaybackSpeed = (
  audio: HTMLAudioElement | null,
  speed: number,
  getLatestSpeed?: () => number
) => {
  if (!audio) return;
  const getSpeed = () => normalizePlaybackSpeed(getLatestSpeed?.() ?? speed);
  applyPlaybackSpeed(audio, getSpeed());

  if (typeof window === 'undefined') return;

  window.requestAnimationFrame(() => applyPlaybackSpeed(audio, getSpeed()));
  [50, 250, 1000].forEach((delay) => {
    window.setTimeout(() => applyPlaybackSpeed(audio, getSpeed()), delay);
  });
};

const createManagedAudioElement = () => {
  const audio = typeof document !== 'undefined'
    ? document.createElement('audio')
    : new Audio();

  audio.preload = 'auto';
  audio.crossOrigin = 'anonymous';

  // Android/installed PWAs are more reliable when the media element is attached
  // to the DOM instead of being only an off-DOM `new Audio()` instance.
  if (typeof document !== 'undefined') {
    audio.dataset.quranAudioPlayer = 'true';
    audio.style.display = 'none';
    document.body.appendChild(audio);
  }

  return audio;
};

const disposeManagedAudioElement = (audio: HTMLAudioElement | null) => {
  if (!audio) return;
  try {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    audio.remove();
  } catch (error) {
    console.warn('Impossible de nettoyer l’audio:', error);
  }
};

export const useQuranAudio = ({ 
  surahNumber, 
  totalVerses, 
  reciter: externalReciter = 'husary',
  onVerseChange 
}: UseQuranAudioOptions) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentVerse, _setCurrentVerse] = useState(1);
  const [reciter, setReciter] = useState<ReciterId>(externalReciter);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeatSettings, _setRepeatSettings] = useState<RepeatSettings>({ mode: 'none', count: 1 });
  const [currentRepeatCount, _setCurrentRepeatCount] = useState(0);
  const [playbackSpeed, _setPlaybackSpeed] = useState(readSavedPlaybackSpeed);

  // Sync reciter with external prop
  useEffect(() => {
    setReciter(externalReciter);
  }, [externalReciter]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playVerseRef = useRef<(verseNumber: number) => void>(() => {});
  const currentVerseRef = useRef(1);
  const totalVersesRef = useRef(totalVerses);
  const repeatSettingsRef = useRef<RepeatSettings>({ mode: 'none', count: 1 });
  const currentRepeatCountRef = useRef(0);
  const onVerseChangeRef = useRef(onVerseChange);
  const playbackSpeedRef = useRef(readSavedPlaybackSpeed());
  const speedEnforcerRef = useRef<number | null>(null);
  const reciterRef = useRef<ReciterId>(externalReciter);
  useEffect(() => { reciterRef.current = reciter; }, [reciter]);

  const syncPlaybackSpeed = useCallback((audio: HTMLAudioElement | null) => {
    schedulePlaybackSpeed(audio, playbackSpeedRef.current, () => playbackSpeedRef.current);
  }, []);

  const stopSpeedEnforcer = useCallback(() => {
    if (speedEnforcerRef.current !== null) {
      window.clearInterval(speedEnforcerRef.current);
      speedEnforcerRef.current = null;
    }
  }, []);

  const startSpeedEnforcer = useCallback((audio: HTMLAudioElement | null) => {
    if (!audio || typeof window === 'undefined') return;
    stopSpeedEnforcer();
    speedEnforcerRef.current = window.setInterval(() => {
      if (audio !== audioRef.current || audio.paused || audio.ended) {
        stopSpeedEnforcer();
        return;
      }
      if (Math.abs(audio.playbackRate - playbackSpeedRef.current) > 0.01) {
        applyPlaybackSpeed(audio, playbackSpeedRef.current);
      }
    }, 200);
  }, [stopSpeedEnforcer]);

  // Wrappers that update BOTH state and ref synchronously
  const setCurrentVerse = useCallback((v: number | ((prev: number) => number)) => {
    _setCurrentVerse(prev => {
      const next = typeof v === 'function' ? v(prev) : v;
      currentVerseRef.current = next;
      return next;
    });
  }, []);

  const setCurrentRepeatCount = useCallback((v: number | ((prev: number) => number)) => {
    _setCurrentRepeatCount(prev => {
      const next = typeof v === 'function' ? v(prev) : v;
      currentRepeatCountRef.current = next;
      return next;
    });
  }, []);

  // Keep other refs in sync
  useEffect(() => { totalVersesRef.current = totalVerses; }, [totalVerses]);
  useEffect(() => { onVerseChangeRef.current = onVerseChange; }, [onVerseChange]);
  useEffect(() => { repeatSettingsRef.current = repeatSettings; }, [repeatSettings]);
  useEffect(() => { playbackSpeedRef.current = playbackSpeed; }, [playbackSpeed]);

  // Setup audio event handlers - only act if this audio is still the current one
  const setupAudioListeners = useCallback((audio: HTMLAudioElement) => {
    audio.addEventListener('timeupdate', () => {
      if (audio !== audioRef.current) return;
      if (Math.abs(audio.playbackRate - playbackSpeedRef.current) > 0.01) {
        syncPlaybackSpeed(audio);
      }
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    });
    
    audio.addEventListener('loadedmetadata', () => {
      if (audio !== audioRef.current) return;
      syncPlaybackSpeed(audio);
      setDuration(audio.duration);
    });

    ['loadeddata', 'canplay', 'canplaythrough', 'durationchange'].forEach((eventName) => {
      audio.addEventListener(eventName, () => {
        if (audio !== audioRef.current) return;
        syncPlaybackSpeed(audio);
      });
    });

    audio.addEventListener('play', () => {
      if (audio !== audioRef.current) return;
      syncPlaybackSpeed(audio);
      startSpeedEnforcer(audio);
    });

    audio.addEventListener('playing', () => {
      if (audio !== audioRef.current) return;
      syncPlaybackSpeed(audio);
      startSpeedEnforcer(audio);
    });

    audio.addEventListener('ratechange', () => {
      if (audio !== audioRef.current) return;
      if (Math.abs(audio.playbackRate - playbackSpeedRef.current) > 0.01) {
        syncPlaybackSpeed(audio);
      }
    });
    
    audio.addEventListener('ended', () => {
      if (audio !== audioRef.current) return;
      stopSpeedEnforcer();
      setIsPlaying(false);
      // Full-surah reciters: audio file is the entire surah, so just stop at end.
      // No auto-advance, no repetition (would loop the whole surah).
      if (RECITERS[reciterRef.current]?.fullSurah) {
        toast.success('Fin de la sourate');
        return;
      }
      // Handle auto-play directly here using refs for always-fresh values
      const cv = currentVerseRef.current;
      const tv = totalVersesRef.current;
      const rs = repeatSettingsRef.current;
      const rc = currentRepeatCountRef.current;
      const { mode, count, rangeStart, rangeEnd } = rs;
      const play = (v: number) => setTimeout(() => playVerseRef.current(v), 300);

      if (mode === 'verse') {
        const shouldRepeat = count === 0 || rc < count - 1;
        if (shouldRepeat) {
          setCurrentRepeatCount(prev => prev + 1);
          play(cv);
          return;
        } else {
          setCurrentRepeatCount(0);
          if (cv < tv) {
            const next = cv + 1;
            setCurrentVerse(next);
            onVerseChangeRef.current?.(next);
            play(next);
            return;
          }
        }
      } else if (mode === 'range' && rangeStart !== undefined && rangeEnd !== undefined) {
        if (cv < rangeEnd) {
          const next = cv + 1;
          setCurrentVerse(next);
          onVerseChangeRef.current?.(next);
          play(next);
          return;
        } else {
          const shouldRepeat = count === 0 || rc < count - 1;
          if (shouldRepeat) {
            setCurrentRepeatCount(prev => prev + 1);
            setCurrentVerse(rangeStart);
            onVerseChangeRef.current?.(rangeStart);
            play(rangeStart);
            return;
          } else {
            setCurrentRepeatCount(0);
            toast.success('Fin de la répétition');
          }
        }
      } else {
        // Normal playback
        if (cv < tv) {
          const next = cv + 1;
          setCurrentVerse(next);
          onVerseChangeRef.current?.(next);
          play(next);
        } else {
          toast.success('Fin de la sourate');
        }
      }
    });
    
    audio.addEventListener('error', () => {
      if (audio !== audioRef.current) return;
      if (!audio.src || audio.src === '' || audio.src === window.location.href) return;
      stopSpeedEnforcer();
      console.error('Audio error for src:', audio.src);
      setIsLoading(false);
      setIsPlaying(false);
      toast.error('Erreur de chargement audio');
    });
  }, [startSpeedEnforcer, stopSpeedEnforcer, syncPlaybackSpeed]);

  // Create initial audio element
  useEffect(() => {
    const audio = createManagedAudioElement();
    setupAudioListeners(audio);
    audioRef.current = audio;
    syncPlaybackSpeed(audio);
    
    return () => {
      stopSpeedEnforcer();
      disposeManagedAudioElement(audio);
      if (audioRef.current === audio) audioRef.current = null;
    };
  }, [setupAudioListeners, stopSpeedEnforcer, syncPlaybackSpeed]);


  // Helper to format verse number for everyayah.com (e.g., 001, 002, 123)
  const formatVerseNumber = (num: number) => num.toString().padStart(3, '0');
  const formatSurahNumber = (num: number) => num.toString().padStart(3, '0');

  // everyayah.com folder names for each reciter
  const EVERYAYAH_FOLDERS: Record<string, string> = {
    husary: 'Husary_128kbps',
    ibrahimDosaryWarsh: 'warsh/warsh_ibrahim_aldosary_128kbps',
  };

  const getAudioUrl = useCallback((surah: number, verse: number, reciterId: ReciterId) => {
    const surahStr = formatSurahNumber(surah);
    const verseStr = formatVerseNumber(verse);
    const info = RECITERS[reciterId];
    if (info?.fullSurah && info.fullSurahBaseUrl) {
      return `${info.fullSurahBaseUrl}${surahStr}.mp3`;
    }
    if (info?.archiveItem) {
      return `https://archive.org/download/${info.archiveItem}/${surahStr}.zip/${surahStr}${verseStr}.mp3`;
    }
    const folder = EVERYAYAH_FOLDERS[reciterId];
    if (folder) {
      return `https://everyayah.com/data/${folder}/${surahStr}${verseStr}.mp3`;
    }
    // Fallback to Husary
    return `https://everyayah.com/data/Husary_128kbps/${surahStr}${verseStr}.mp3`;
  }, []);

  const playAudioFromUrl = useCallback((audio: HTMLAudioElement, url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      syncPlaybackSpeed(audio);
      const onCanPlay = () => {
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('error', onError);
        // Re-apply playback rate AFTER load (some browsers reset it on load)
        syncPlaybackSpeed(audio);
        audio.play().then(() => {
          syncPlaybackSpeed(audio);
          startSpeedEnforcer(audio);
          resolve();
        }).catch(reject);
      };
      const onError = () => {
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('error', onError);
        reject(new Error('Audio load failed'));
      };
      audio.addEventListener('canplay', onCanPlay);
      audio.addEventListener('error', onError);
      audio.defaultPlaybackRate = playbackSpeedRef.current;
      audio.playbackRate = playbackSpeedRef.current;
      audio.src = url;
      syncPlaybackSpeed(audio);
      audio.load();
      syncPlaybackSpeed(audio);
    });
  }, [startSpeedEnforcer, syncPlaybackSpeed]);

  const playVerseAt = useCallback(async (targetSurah: number, verseNumber: number) => {
    setIsLoading(true);
    
    try {
      // Create a fresh audio element to avoid corrupted state
      if (audioRef.current) {
        stopSpeedEnforcer();
        disposeManagedAudioElement(audioRef.current);
      }
      const newAudio = createManagedAudioElement();
      setupAudioListeners(newAudio);
      audioRef.current = newAudio;
      syncPlaybackSpeed(newAudio);

      // Check localStorage for cached audio URL (offline support)
      const cachedUrl = getCachedAudioUrl(reciter, targetSurah, verseNumber);
      if (cachedUrl) {
        await playAudioFromUrl(newAudio, cachedUrl);
        setIsPlaying(true);
        setCurrentVerse(verseNumber);
        onVerseChangeRef.current?.(verseNumber);
        return;
      }

      // Use everyayah.com directly for all reciters (cdn.islamic.network is unreliable)
      const audioUrl = getAudioUrl(targetSurah, verseNumber, reciter);
      await playAudioFromUrl(newAudio, audioUrl);
      setIsPlaying(true);
      setCurrentVerse(verseNumber);
      onVerseChangeRef.current?.(verseNumber);
    } catch (error) {
      console.error('Error loading audio:', error);
      toast.error('Impossible de charger l\'audio');
    } finally {
      setIsLoading(false);
    }
  }, [reciter, getAudioUrl, setupAudioListeners, playAudioFromUrl, stopSpeedEnforcer, syncPlaybackSpeed]);

  const playVerse = useCallback(async (verseNumber: number) => {
    await playVerseAt(surahNumber, verseNumber);
  }, [playVerseAt, surahNumber]);

  // Keep ref in sync so the auto-play effect always calls the latest version
  useEffect(() => {
    playVerseRef.current = playVerse;
  }, [playVerse]);

  const play = useCallback(() => {
    if (audioRef.current?.src) {
      syncPlaybackSpeed(audioRef.current);
      audioRef.current.play().then(() => {
        syncPlaybackSpeed(audioRef.current);
        startSpeedEnforcer(audioRef.current);
      }).catch((error) => {
        console.error('Error playing audio:', error);
        setIsPlaying(false);
        toast.error('Impossible de lancer l\'audio');
      });
      setIsPlaying(true);
    } else {
      playVerse(currentVerse);
    }
  }, [currentVerse, playVerse, startSpeedEnforcer, syncPlaybackSpeed]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      stopSpeedEnforcer();
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [stopSpeedEnforcer]);

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
    const nextSpeed = normalizePlaybackSpeed(speed);
    _setPlaybackSpeed(nextSpeed);
    playbackSpeedRef.current = nextSpeed;
    savePlaybackSpeed(nextSpeed);
    syncPlaybackSpeed(audioRef.current);
    toast.success(`Vitesse: ${nextSpeed}x`);
  }, [syncPlaybackSpeed]);

  const setRepeatMode = useCallback((mode: RepeatMode, count: number = 1, rangeStart?: number, rangeEnd?: number) => {
    const newSettings = { mode, count, rangeStart, rangeEnd };
    _setRepeatSettings(newSettings);
    repeatSettingsRef.current = newSettings;
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
    playVerseAt,
    changeReciter,
    seek,
    setCurrentVerse,
    setRepeatMode,
    toggleRepeatVerse,
    changeSpeed,
  };
};
