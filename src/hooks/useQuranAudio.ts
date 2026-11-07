import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { getOfflineAudioUrl, isOnlineOnlyAudio } from '@/lib/offlineAudioStore';
import { getJuzForVerse } from '@/data/surahs';
import { advanceRecitation, type RecitationSession } from '@/lib/recitationSession';

// Interface moved inside hook for better organization

// Reciter options organized by Qira'at (reading style)
export const QIRAAT_LABELS = {
  hafs: 'Hafs (حفص)',
  warsh: 'Warsh (ورش)',
  qalun: 'Qalun (قالون)',
} as const;

export type QiraatId = keyof typeof QIRAAT_LABELS;

// Available voices, grouped by their Quran reading tradition.
export const RECITER_IDS = [
  'husary',
  'maher',
  'husaryWarshPerVerse',
  'yassinWarsh',
  'husaryQalunPerVerse',
  'hudhaifiQalun',
] as const;

export type ReciterId = (typeof RECITER_IDS)[number];

export interface ReciterInfo {
  id: string;
  name: string;
  nameAr: string;
  qiraat: QiraatId;
  quranicAudioId?: number;
  /** EveryAyah directory, including any riwaya subdirectory. */
  everyAyahFolder?: string;
  /** When true, audio is delivered as a single MP3 per surah (no per-verse files). */
  fullSurah?: boolean;
  /** Full-surah MP3 base URL; surah number is appended as 3-digit padded `.mp3`. */
  fullSurahBaseUrl?: string;
  fullSurahUrls?: Readonly<Record<number, string>>;
  /** Some public media hosts permit playback but not CORS downloads. */
  playbackWithoutCors?: boolean;
  /**
   * Archive.org item where per-verse MP3s are bundled inside one ZIP per surah.
   * URL pattern: `https://archive.org/download/{archiveItem}/{SSS}.zip/{SSSAAA}.mp3`.
   */
  archiveItem?: string;
  /**
   * Zero-padding width for the surah-zip filename inside `archiveItem`.
   * Default is 3 (e.g. `001.zip`). Some archives use 2 (e.g. `01.zip`).
   */
  archiveZipPad?: 2 | 3;
  /** Archive ZIPs are grouped by juz (`{JJ}.zip`), with optional inner folders for listed juz. */
  archiveZipByJuz?: boolean;
  archiveJuzInnerFolders?: readonly number[];
}

export const RECITERS: Record<ReciterId, ReciterInfo> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // HAFS (حفص عن عاصم) — Mahmoud Khalil Al-Husary (référence mondiale)
  // ═══════════════════════════════════════════════════════════════════════════
  husary: { id: 'ar.husary', name: 'Mahmoud Khalil Al-Husary', nameAr: 'محمود خليل الحصري', qiraat: 'hafs', quranicAudioId: 18 },
  maher: { id: 'ar.maher', name: 'Maher Al-Muaiqly', nameAr: 'ماهر المعيقلي', qiraat: 'hafs', archiveItem: 'way2sona_20160427_1847' },

  // ═══════════════════════════════════════════════════════════════════════════
  // WARSH (ورش عن نافع)
  // ═══════════════════════════════════════════════════════════════════════════


  husaryWarshPerVerse: {
    id: 'husary_warsh_per_verse',
    name: 'Al-Husary (Warsh – verset par verset)',
    nameAr: 'محمود خليل الحصري (ورش – آية آية)',
    qiraat: 'warsh',
    archiveItem:
      '64kb---ayat--alhosary---warsh---full-quran---mp3-----verse--by--verse---6236--',
    archiveZipPad: 2,
  },
  yassinWarsh: {
    id: 'warsh.yassin',
    name: 'Yassen Al-Jazairi (Warsh)',
    nameAr: 'ياسين الجزائري (ورش)',
    qiraat: 'warsh',
    everyAyahFolder: 'warsh/warsh_yassin_al_jazaery_64kbps',
  },

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
  // Ali Al-Hudhaifi — Qaloun, 6236 fichiers verset par verset, ZIP par juz (juz 23-24 dans un sous-dossier).
  hudhaifiQalun: {
    id: 'hudhaifi_qalun_per_verse',
    name: 'Ali Al-Hudhaifi (Qalun)',
    nameAr: 'علي الحذيفي (قالون)',
    qiraat: 'qalun',
    archiveItem: 'way2sona_20160426_2135',
    archiveZipByJuz: true,
    archiveJuzInnerFolders: [23, 24],
  },
};

export const isReciterId = (value: unknown): value is ReciterId =>
  typeof value === 'string' && value in RECITERS;

export const getSafeReciter = (value: unknown): ReciterId =>
  isReciterId(value) ? value : value === 'juhani' ? 'maher' : value === 'ganayniQalun' ? 'husaryQalunPerVerse' : 'husary';

/** Single source for streaming, verse downloads and offline downloads. */
export const getReciterAudioUrl = (surah: number, verse: number, reciterId: ReciterId): string => {
  const surahStr = String(surah).padStart(3, '0');
  const verseStr = String(verse).padStart(3, '0');
  const info = RECITERS[getSafeReciter(reciterId)];
  if (info.fullSurahUrls) {
    const url = info.fullSurahUrls[surah];
    if (!url) throw new Error(`Missing surah recording: ${surah}`);
    return url;
  }
  if (info.fullSurah && info.fullSurahBaseUrl) return `${info.fullSurahBaseUrl}${surahStr}.mp3`;
  if (info.archiveItem && info.archiveZipByJuz) {
    const juz = String(getJuzForVerse(surah, verse)).padStart(2, '0');
    const inner = info.archiveJuzInnerFolders?.includes(Number(juz)) ? `${juz}/` : '';
    return `https://archive.org/download/${info.archiveItem}/${juz}.zip/${inner}${surahStr}${verseStr}.mp3`;
  }
  if (info.archiveItem) {
    const zipName = info.archiveZipPad === 2 ? String(surah).padStart(2, '0') : surahStr;
    return `https://archive.org/download/${info.archiveItem}/${zipName}.zip/${surahStr}${verseStr}.mp3`;
  }
  const folder = info.everyAyahFolder ?? 'Husary_128kbps';
  return `https://everyayah.com/data/${folder}/${surahStr}${verseStr}.mp3`;
};

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
  onSurahChange?: (surah: number, verse: number) => void;
}

const normalizePlaybackSpeed = (speed: number) => {
  if (!Number.isFinite(speed)) return 1;
  return Math.min(3, Math.max(0.5, speed));
};

const PLAYBACK_SPEED_STORAGE_KEY = 'quran-audio-playback-speed';

const REPEAT_PAUSE_ENABLED_KEY = 'quran-audio-repeat-pause-enabled';
const REPEAT_PAUSE_MULTIPLIER_KEY = 'quran-audio-repeat-pause-multiplier';

export interface RepeatPauseSettings {
  enabled: boolean;
  /** Multiplier applied to the verse duration to compute the pause length. */
  multiplier: number;
}

const normalizeRepeatMultiplier = (value: number) => {
  if (!Number.isFinite(value)) return 1;
  return Math.min(3, Math.max(0.5, value));
};

const readSavedRepeatPause = (): RepeatPauseSettings => {
  if (typeof window === 'undefined') return { enabled: false, multiplier: 1 };
  const enabled = window.localStorage.getItem(REPEAT_PAUSE_ENABLED_KEY) === '1';
  const multiplier = normalizeRepeatMultiplier(
    Number(window.localStorage.getItem(REPEAT_PAUSE_MULTIPLIER_KEY)) || 1
  );
  return { enabled, multiplier };
};

const saveRepeatPause = (settings: RepeatPauseSettings) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(REPEAT_PAUSE_ENABLED_KEY, settings.enabled ? '1' : '0');
  window.localStorage.setItem(REPEAT_PAUSE_MULTIPLIER_KEY, String(settings.multiplier));
};

const readSavedPlaybackSpeed = () => {
  if (typeof window === 'undefined') return 1;
  // `Number(null)` vaut 0 quand aucune vitesse n'est enregistrée : sans le
  // `|| 1`, la vitesse par défaut tombait à 0.5x au lieu de 1x.
  return normalizePlaybackSpeed(Number(window.localStorage.getItem(PLAYBACK_SPEED_STORAGE_KEY)) || 1);
};

const savePlaybackSpeed = (speed: number) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PLAYBACK_SPEED_STORAGE_KEY, String(normalizePlaybackSpeed(speed)));
};

const applyPlaybackSpeed = (audio: HTMLAudioElement | null, speed: number) => {
  if (!audio) return;
  const normalizedSpeed = normalizePlaybackSpeed(speed);
  // Rewriting an unchanged rate mid-playback makes some Android decoders crackle.
  if (Math.abs(audio.playbackRate - normalizedSpeed) < 0.01 && Math.abs(audio.defaultPlaybackRate - normalizedSpeed) < 0.01) return;
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
  onVerseChange,
  onSurahChange
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
  const [repeatPause, _setRepeatPause] = useState<RepeatPauseSettings>(readSavedRepeatPause);
  const [isPausingForRepeat, setIsPausingForRepeat] = useState(false);
  const [pauseRemainingSec, setPauseRemainingSec] = useState(0);

  const [recitationSession, _setRecitationSession] = useState<RecitationSession | null>(null);
  const sessionRef = useRef<RecitationSession | null>(null);
  const activeSurahRef = useRef(surahNumber);
  const onSurahChangeRef = useRef(onSurahChange);
  useEffect(() => { onSurahChangeRef.current = onSurahChange; }, [onSurahChange]);
  const playVerseAtRef = useRef<(surah: number, verse: number) => void>(() => {});
  const setRecitationSession = useCallback((session: RecitationSession | null) => {
    sessionRef.current = session;
    _setRecitationSession(session);
  }, []);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playVerseRef = useRef<(verseNumber: number) => void>(() => {});
  const currentVerseRef = useRef(1);
  const totalVersesRef = useRef(totalVerses);
  const repeatSettingsRef = useRef<RepeatSettings>({ mode: 'none', count: 1 });
  const currentRepeatCountRef = useRef(0);
  const onVerseChangeRef = useRef(onVerseChange);
  const playbackSpeedRef = useRef(readSavedPlaybackSpeed());
  const loadControllerRef = useRef<AbortController | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const repeatPauseRef = useRef<RepeatPauseSettings>(readSavedRepeatPause());
  const pauseTimeoutRef = useRef<number | null>(null);
  const pauseCountdownRef = useRef<number | null>(null);
  const reciterRef = useRef<ReciterId>(externalReciter);

  const syncPlaybackSpeed = useCallback((audio: HTMLAudioElement | null) => {
    applyPlaybackSpeed(audio, playbackSpeedRef.current);
  }, []);

  const clearSource = useCallback(() => {
    loadControllerRef.current?.abort();
    loadControllerRef.current = null;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    blobUrlRef.current = null;
  }, []);

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
  useEffect(() => { repeatPauseRef.current = repeatPause; }, [repeatPause]);

  const clearRepeatPauseTimers = useCallback(() => {
    if (pauseTimeoutRef.current !== null) {
      window.clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
    if (pauseCountdownRef.current !== null) {
      window.clearInterval(pauseCountdownRef.current);
      pauseCountdownRef.current = null;
    }
    setIsPausingForRepeat(false);
    setPauseRemainingSec(0);
  }, []);

  // Setup audio event handlers - only act if this audio is still the current one
  const setupAudioListeners = useCallback((audio: HTMLAudioElement) => {
    audio.addEventListener('timeupdate', () => {
      if (audio !== audioRef.current) return;
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    });
    
    audio.addEventListener('loadedmetadata', () => {
      if (audio !== audioRef.current) return;
      syncPlaybackSpeed(audio);
      setDuration(audio.duration);
    });

    audio.addEventListener('ended', () => {
      if (audio !== audioRef.current) return;
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
      const verseDurationMs = Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.duration * 1000
        : 0;
      const rp = repeatPauseRef.current;
      const play = (v: number) => {
        clearRepeatPauseTimers();
        if (rp.enabled && verseDurationMs > 0) {
          const waitMs = Math.max(500, verseDurationMs * rp.multiplier);
          setIsPausingForRepeat(true);
          setPauseRemainingSec(Math.ceil(waitMs / 1000));
          pauseCountdownRef.current = window.setInterval(() => {
            setPauseRemainingSec((s) => (s > 1 ? s - 1 : 0));
          }, 1000);
          pauseTimeoutRef.current = window.setTimeout(() => {
            clearRepeatPauseTimers();
            playVerseRef.current(v);
          }, waitMs);
        } else {
          pauseTimeoutRef.current = window.setTimeout(() => { clearRepeatPauseTimers(); playVerseRef.current(v); }, 0);
        }
      };

      const session = sessionRef.current;
      if (session) {
        if (mode === 'verse' && (count === 0 || rc < count - 1)) {
          setCurrentRepeatCount(prev => prev + 1);
          play(cv);
          return;
        }
        setCurrentRepeatCount(0);
        const advance = advanceRecitation(session, { surah: activeSurahRef.current, verse: cv });
        setRecitationSession({ ...session, completedPassages: advance.completedPassages });
        if (!advance.next) {
          toast.success(session.end.surah === 114 && session.end.verse === 6 ? 'Fin du Coran / نهاية القرآن' : 'Fin de la récitation / نهاية التلاوة');
          return;
        }
        const next = advance.next;
        clearRepeatPauseTimers();
        const waitMs = rp.enabled && verseDurationMs > 0 ? Math.max(500, verseDurationMs * rp.multiplier) : 0;
        if (rp.enabled && verseDurationMs > 0) {
          setIsPausingForRepeat(true);
          setPauseRemainingSec(Math.ceil(waitMs / 1000));
        }
        pauseTimeoutRef.current = window.setTimeout(() => {
          clearRepeatPauseTimers();
          playVerseAtRef.current(next.surah, next.verse);
        }, waitMs);
        return;
      }

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
      console.error('Audio error for src:', audio.src);
      setIsLoading(false);
      setIsPlaying(false);
      toast.error('Erreur de chargement audio');
    });
  }, [clearRepeatPauseTimers, setCurrentRepeatCount, setCurrentVerse, setRecitationSession, syncPlaybackSpeed]);

  // Create initial audio element
  useEffect(() => {
    const audio = createManagedAudioElement();
    setupAudioListeners(audio);
    audioRef.current = audio;
    syncPlaybackSpeed(audio);
    
    return () => {
      if (pauseTimeoutRef.current !== null) window.clearTimeout(pauseTimeoutRef.current);
      if (pauseCountdownRef.current !== null) window.clearInterval(pauseCountdownRef.current);
      loadControllerRef.current?.abort();
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
      disposeManagedAudioElement(audio);
      if (audioRef.current === audio) audioRef.current = null;
    };
  }, [setupAudioListeners, syncPlaybackSpeed]);


  const playAudioFromUrl = useCallback((audio: HTMLAudioElement, url: string, signal: AbortSignal): Promise<void> => {
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('error', onError);
        signal.removeEventListener('abort', onAbort);
      };
      const onAbort = () => { cleanup(); reject(new DOMException('Playback superseded', 'AbortError')); };
      const onCanPlay = () => {
        cleanup();
        if (signal.aborted) return reject(new DOMException('Playback superseded', 'AbortError'));
        syncPlaybackSpeed(audio);
        audio.play().then(resolve, reject);
      };
      const onError = () => { cleanup(); reject(new Error('Audio load failed')); };
      if (signal.aborted) return onAbort();
      signal.addEventListener('abort', onAbort, { once: true });
      audio.addEventListener('canplay', onCanPlay);
      audio.addEventListener('error', onError);
      audio.src = url;
      audio.load();
    });
  }, [syncPlaybackSpeed]);

  const playVerseAt = useCallback(async (targetSurah: number, verseNumber: number) => {
    const selectedReciter = reciterRef.current;
    if (RECITERS[selectedReciter].fullSurah) verseNumber = 1;
    const audio = audioRef.current;
    if (!audio) return;
    clearRepeatPauseTimers();
    clearSource();
    const controller = new AbortController();
    loadControllerRef.current = controller;
    if (targetSurah !== activeSurahRef.current) onSurahChangeRef.current?.(targetSurah, verseNumber);
    activeSurahRef.current = targetSurah;
    currentVerseRef.current = verseNumber;
    setCurrentVerse(verseNumber);
    setProgress(0);
    setDuration(0);
    setIsPlaying(false);
    setIsLoading(true);
    try {
      const preferOnline = isOnlineOnlyAudio() && navigator.onLine;
      const cachedUrl = preferOnline ? null : await getOfflineAudioUrl(selectedReciter, targetSurah, verseNumber);
      if (controller.signal.aborted) {
        if (cachedUrl) URL.revokeObjectURL(cachedUrl);
        return;
      }
      // Playback does not need CORS, and local blobs must not carry it in Android WebViews.
      audio.removeAttribute('crossorigin');
      if (cachedUrl) {
        blobUrlRef.current = cachedUrl;
        try {
          await playAudioFromUrl(audio, cachedUrl, controller.signal);
          if (controller.signal.aborted) return;
          setIsPlaying(true);
          onVerseChangeRef.current?.(verseNumber);
          return;
        } catch (error) {
          if (controller.signal.aborted || !navigator.onLine) throw error;
          URL.revokeObjectURL(cachedUrl);
          blobUrlRef.current = null;
        }
      }
      await playAudioFromUrl(audio, getReciterAudioUrl(targetSurah, verseNumber, selectedReciter), controller.signal);
      if (controller.signal.aborted) return;
      setIsPlaying(true);
      onVerseChangeRef.current?.(verseNumber);
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error('Error loading audio:', error);
      setIsPlaying(false);
      toast.error('Impossible de charger l\'audio');
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [playAudioFromUrl, clearSource, clearRepeatPauseTimers, setCurrentVerse]);

  const playVerse = useCallback(async (verseNumber: number) => {
    await playVerseAt(surahNumber, verseNumber);
  }, [playVerseAt, surahNumber]);

  // Keep ref in sync so the auto-play effect always calls the latest version
  useEffect(() => {
    playVerseAtRef.current = playVerseAt;
    playVerseRef.current = (verse) => playVerseAt(activeSurahRef.current, verse);
  }, [playVerseAt]);

  const play = useCallback(() => {
    if (audioRef.current?.src) {
      syncPlaybackSpeed(audioRef.current);
      audioRef.current.play().then(() => {
        syncPlaybackSpeed(audioRef.current);
      }).catch((error) => {
        console.error('Error playing audio:', error);
        setIsPlaying(false);
        toast.error('Impossible de lancer l\'audio');
      });
      setIsPlaying(true);
    } else {
      playVerse(currentVerse);
    }
  }, [currentVerse, playVerse, syncPlaybackSpeed]);

  const pause = useCallback(() => {
    clearRepeatPauseTimers();
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [clearRepeatPauseTimers]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const nextVerse = useCallback(() => {
    if (RECITERS[reciterRef.current].fullSurah) return;
    clearRepeatPauseTimers();
    if (currentVerse < totalVerses) {
      const next = currentVerse + 1;
      setCurrentVerse(next);
      onVerseChange?.(next);
      if (isPlaying || audioRef.current?.src) {
        playVerse(next);
      }
    }
  }, [currentVerse, totalVerses, isPlaying, playVerse, onVerseChange, clearRepeatPauseTimers]);

  const previousVerse = useCallback(() => {
    if (RECITERS[reciterRef.current].fullSurah) return;
    clearRepeatPauseTimers();
    if (currentVerse > 1) {
      const prev = currentVerse - 1;
      setCurrentVerse(prev);
      onVerseChange?.(prev);
      if (isPlaying || audioRef.current?.src) {
        playVerse(prev);
      }
    }
  }, [currentVerse, isPlaying, playVerse, onVerseChange, clearRepeatPauseTimers]);

  const goToVerse = useCallback((verseNumber: number) => {
    if (verseNumber >= 1 && verseNumber <= totalVerses) {
      setCurrentVerse(verseNumber);
      onVerseChange?.(verseNumber);
    }
  }, [totalVerses, onVerseChange]);

  const changeReciter = useCallback((newReciter: ReciterId) => {
    if (reciterRef.current === newReciter) return;
    reciterRef.current = newReciter;
    setReciter(newReciter);
    const resume = isPlaying || isLoading;
    pause();
    // Remove the old source even while paused: Play must use the new voice.
    clearSource();
    setProgress(0);
    setDuration(0);
    setIsLoading(false);
    if (resume) {
      void playVerseAt(activeSurahRef.current, currentVerseRef.current);
    }
  }, [isPlaying, isLoading, pause, playVerseAt, clearSource]);

  const changeReciterRef = useRef(changeReciter);
  changeReciterRef.current = changeReciter;
  useEffect(() => {
    changeReciterRef.current(externalReciter);
  }, [externalReciter]);

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

  const setRepeatPauseSettings = useCallback(
    (next: Partial<RepeatPauseSettings>) => {
      _setRepeatPause((prev) => {
        const merged: RepeatPauseSettings = {
          enabled: next.enabled ?? prev.enabled,
          multiplier: normalizeRepeatMultiplier(next.multiplier ?? prev.multiplier),
        };
        repeatPauseRef.current = merged;
        saveRepeatPause(merged);
        if (!merged.enabled) {
          clearRepeatPauseTimers();
        }
        if (next.enabled === true && (prev.enabled === false)) {
          toast.success('Pause de répétition activée');
        } else if (next.enabled === false && prev.enabled === true) {
          toast.info('Pause de répétition désactivée');
        }
        return merged;
      });
    },
    [clearRepeatPauseTimers]
  );

  return {
    recitationSession,
    setRecitationSession,
    isPlaying,
    isLoading,
    currentVerse,
    reciter,
    progress,
    duration,
    repeatSettings,
    currentRepeatCount,
    playbackSpeed,
    repeatPause,
    isPausingForRepeat,
    pauseRemainingSec,
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
    setRepeatPauseSettings,
  };
};
