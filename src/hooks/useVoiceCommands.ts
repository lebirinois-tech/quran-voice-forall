import { useState, useEffect, useCallback, useRef } from 'react';

export type VoiceLang = 'fr' | 'en' | 'ar';

const VOICE_LANG_KEY = 'quran_voice_lang';

export const getStoredVoiceLang = (): VoiceLang => {
  return (localStorage.getItem(VOICE_LANG_KEY) as VoiceLang) || 'fr';
};

export const setStoredVoiceLang = (lang: VoiceLang) => {
  localStorage.setItem(VOICE_LANG_KEY, lang);
};

interface VoiceCommandsOptions {
  onNavigateToSurah?: (surahNumber: number) => void;
  onNavigateToPage?: (pageNumber: number) => void;
  onNavigateToJuz?: (juzNumber: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onNextVerse?: () => void;
  onPreviousVerse?: () => void;
  onGoHome?: () => void;
  onReadVerse?: (verseNumber: number) => void;
  onRepeatVerse?: (count: number) => void;
  onRepeatRange?: (start: number, end: number, count: number) => void;
  onStopRepeat?: () => void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// ── Arabic number words ──
const ARABIC_NUMBERS: Record<string, number> = {
  'واحد': 1, 'واحدة': 1, 'أول': 1, 'أولى': 1,
  'اثنين': 2, 'اثنان': 2, 'ثاني': 2, 'ثانية': 2,
  'ثلاث': 3, 'ثلاثة': 3, 'ثالث': 3,
  'أربع': 4, 'أربعة': 4, 'رابع': 4,
  'خمس': 5, 'خمسة': 5, 'خامس': 5,
  'ست': 6, 'ستة': 6, 'سادس': 6,
  'سبع': 7, 'سبعة': 7, 'سابع': 7,
  'ثمان': 8, 'ثمانية': 8, 'ثامن': 8,
  'تسع': 9, 'تسعة': 9, 'تاسع': 9,
  'عشر': 10, 'عشرة': 10, 'عاشر': 10,
  'أحد عشر': 11, 'اثنا عشر': 12, 'ثلاثة عشر': 13,
  'أربعة عشر': 14, 'خمسة عشر': 15, 'ستة عشر': 16,
  'سبعة عشر': 17, 'ثمانية عشر': 18, 'تسعة عشر': 19,
  'عشرين': 20, 'عشرون': 20, 'ثلاثين': 30, 'ثلاثون': 30,
};

// ── Arabic surah names ──
const ARABIC_SURAH_NAMES: Record<string, number> = {
  'الفاتحة': 1, 'فاتحة': 1,
  'البقرة': 2, 'بقرة': 2,
  'آل عمران': 3, 'عمران': 3,
  'النساء': 4, 'نساء': 4,
  'المائدة': 5, 'مائدة': 5,
  'الأنعام': 6, 'الأعراف': 7,
  'الأنفال': 8, 'التوبة': 9,
  'يونس': 10, 'هود': 11, 'يوسف': 12,
  'الرعد': 13, 'إبراهيم': 14, 'الحجر': 15,
  'النحل': 16, 'الإسراء': 17, 'الكهف': 18,
  'مريم': 19, 'طه': 20, 'الأنبياء': 21,
  'الحج': 22, 'المؤمنون': 23, 'النور': 24,
  'الفرقان': 25, 'الشعراء': 26, 'النمل': 27,
  'القصص': 28, 'العنكبوت': 29, 'الروم': 30,
  'لقمان': 31, 'السجدة': 32, 'الأحزاب': 33,
  'سبأ': 34, 'فاطر': 35, 'يس': 36, 'ياسين': 36,
  'الصافات': 37, 'ص': 38, 'الزمر': 39,
  'غافر': 40, 'فصلت': 41, 'الشورى': 42,
  'الزخرف': 43, 'الدخان': 44, 'الجاثية': 45,
  'الأحقاف': 46, 'محمد': 47, 'الفتح': 48,
  'الحجرات': 49, 'ق': 50, 'الذاريات': 51,
  'الطور': 52, 'النجم': 53, 'القمر': 54,
  'الرحمن': 55, 'رحمن': 55,
  'الواقعة': 56, 'الحديد': 57, 'المجادلة': 58,
  'الحشر': 59, 'الممتحنة': 60, 'الصف': 61,
  'الجمعة': 62, 'المنافقون': 63, 'التغابن': 64,
  'الطلاق': 65, 'التحريم': 66,
  'الملك': 67, 'ملك': 67,
  'القلم': 68, 'الحاقة': 69, 'المعارج': 70,
  'نوح': 71, 'الجن': 72, 'المزمل': 73,
  'المدثر': 74, 'القيامة': 75, 'الإنسان': 76,
  'المرسلات': 77, 'النبأ': 78, 'النازعات': 79,
  'عبس': 80, 'التكوير': 81, 'الانفطار': 82,
  'المطففين': 83, 'الانشقاق': 84, 'البروج': 85,
  'الطارق': 86, 'الأعلى': 87, 'الغاشية': 88,
  'الفجر': 89, 'البلد': 90, 'الشمس': 91,
  'الليل': 92, 'الضحى': 93, 'الشرح': 94,
  'التين': 95, 'العلق': 96, 'القدر': 97,
  'البينة': 98, 'الزلزلة': 99, 'العاديات': 100,
  'القارعة': 101, 'التكاثر': 102, 'العصر': 103,
  'الهمزة': 104, 'الفيل': 105, 'قريش': 106,
  'الماعون': 107, 'الكوثر': 108, 'الكافرون': 109,
  'النصر': 110, 'المسد': 111,
  'الإخلاص': 112, 'إخلاص': 112,
  'الفلق': 113, 'فلق': 113,
  'الناس': 114, 'ناس': 114,
};

// Helper to parse an Arabic number word from text
const parseArabicNumber = (text: string): number | null => {
  const numMatch = text.match(/\d+/);
  if (numMatch) return parseInt(numMatch[0]);
  for (const [word, num] of Object.entries(ARABIC_NUMBERS)) {
    if (text.includes(word)) return num;
  }
  return null;
};

export const useVoiceCommands = (options: VoiceCommandsOptions) => {
  const [isListening, setIsListening] = useState(false);
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [isAwaitingCommand, setIsAwaitingCommand] = useState(false);
  const [voiceLang, setVoiceLangState] = useState<VoiceLang>(getStoredVoiceLang);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldRestartRef = useRef(false);
  const commandTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ttsSuspendedRef = useRef(false);
  const resumeContinuousAfterTtsRef = useRef(false);

  const setVoiceLang = useCallback((lang: VoiceLang) => {
    setVoiceLangState(lang);
    setStoredVoiceLang(lang);
    // Restart recognition with new language if currently active
    if (shouldRestartRef.current) {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    }
  }, []);

  const WAKE_WORDS_FR = ['coran', 'quran', 'ok coran', 'hey coran'];
  const WAKE_WORDS_AR = ['قرآن', 'يا قرآن', 'القرآن'];

  const getWakeWords = useCallback(() => {
    return voiceLang === 'ar' ? WAKE_WORDS_AR : WAKE_WORDS_FR;
  }, [voiceLang]);

  const getRecognitionLang = useCallback(() => {
    return voiceLang === 'ar' ? 'ar-SA' : 'fr-FR';
  }, [voiceLang]);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SR);
  }, []);

  // ── French command processing ──
  const processCommandFr = useCallback((text: string): string | null => {
    const t = text.toLowerCase().trim();

    if (t.includes('accueil') || t.includes('home') || t.includes('retour')) {
      options.onGoHome?.(); return 'Navigation vers l\'accueil';
    }
    if (t.includes('jouer') || t.includes('play') || t.includes('lire') || t.includes('lecture')) {
      options.onPlay?.(); return 'Lecture démarrée';
    }
    if (t.includes('pause') || t.includes('stop') || t.includes('arrêter') || t.includes('arrête')) {
      options.onPause?.(); return 'Lecture en pause';
    }
    if (t.includes('suivant') || t.includes('next') || t.includes('prochain')) {
      options.onNextVerse?.(); return 'Verset suivant';
    }
    if (t.includes('précédent') || t.includes('previous') || t.includes('avant')) {
      options.onPreviousVerse?.(); return 'Verset précédent';
    }

    const frenchNumbers: Record<string, number> = {
      'un': 1, 'une': 1, 'premier': 1, 'première': 1,
      'deux': 2, 'deuxième': 2, 'trois': 3, 'troisième': 3,
      'quatre': 4, 'quatrième': 4, 'cinq': 5, 'cinquième': 5,
      'six': 6, 'sixième': 6, 'sept': 7, 'septième': 7,
      'huit': 8, 'huitième': 8, 'neuf': 9, 'neuvième': 9,
      'dix': 10, 'dixième': 10, 'onze': 11, 'douze': 12,
      'trente-six': 36, 'trente six': 36,
      'cinquante-cinq': 55, 'cinquante cinq': 55,
      'soixante-sept': 67, 'soixante sept': 67,
      'cent-douze': 112, 'cent douze': 112,
      'cent-treize': 113, 'cent treize': 113,
      'cent-quatorze': 114, 'cent quatorze': 114,
    };

    const surahNames: Record<string, number> = {
      'fatiha': 1, 'al fatiha': 1, 'alfatiha': 1, 'ouverture': 1,
      'baqarah': 2, 'al baqarah': 2, 'vache': 2,
      'yasin': 36, 'ya sin': 36, 'yassin': 36,
      'rahman': 55, 'ar rahman': 55,
      'mulk': 67, 'al mulk': 67, 'royaume': 67,
      'ikhlas': 112, 'al ikhlas': 112, 'sincérité': 112,
      'falaq': 113, 'al falaq': 113, 'aube': 113,
      'nas': 114, 'an nas': 114, 'hommes': 114,
    };

    if (t.includes('sourate') || t.includes('surah') || t.includes('aller')) {
      const numberMatch = t.match(/\d+/);
      if (numberMatch) {
        const n = parseInt(numberMatch[0]);
        if (n >= 1 && n <= 114) { options.onNavigateToSurah?.(n); return `Navigation vers sourate ${n}`; }
      }
      for (const [word, n] of Object.entries(frenchNumbers)) {
        if (t.includes(word)) { options.onNavigateToSurah?.(n); return `Navigation vers sourate ${n}`; }
      }
      for (const [name, n] of Object.entries(surahNames)) {
        if (t.includes(name)) { options.onNavigateToSurah?.(n); return `Navigation vers ${name}`; }
      }
    }

    if (t.includes('page')) {
      const pageMatch = t.match(/page\s*(\d+)/);
      if (pageMatch) {
        const n = parseInt(pageMatch[0].match(/\d+/)![0]);
        if (n >= 1 && n <= 604) { options.onNavigateToPage?.(n); return `Navigation vers page ${n}`; }
      }
      for (const [word, n] of Object.entries(frenchNumbers)) {
        if (t.includes(word)) { options.onNavigateToPage?.(n); return `Navigation vers page ${n}`; }
      }
    }

    if (t.includes('juz') || t.includes('partie') || t.includes('hizb')) {
      const juzMatch = t.match(/\d+/);
      if (juzMatch) {
        const n = parseInt(juzMatch[0]);
        if (n >= 1 && n <= 30) { options.onNavigateToJuz?.(n); return `Navigation vers Juz ${n}`; }
      }
      for (const [word, n] of Object.entries(frenchNumbers)) {
        if (t.includes(word) && n <= 30) { options.onNavigateToJuz?.(n); return `Navigation vers Juz ${n}`; }
      }
    }

    if (t.includes('verset') && !t.includes('répéter') && !t.includes('repeter')) {
      const m = t.match(/verset\s*(\d+)/);
      if (m) { const n = parseInt(m[1]); options.onReadVerse?.(n); return `Lecture du verset ${n}`; }
    }

    if (t.includes('arrêter répétition') || t.includes('arreter repetition') || t.includes('stop répétition') || t.includes('stop repetition') || t.includes('désactiver répétition') || t.includes('desactiver repetition')) {
      options.onStopRepeat?.(); return 'Répétition désactivée';
    }

    if (t.includes('répéter') || t.includes('repeter') || t.includes('répétition') || t.includes('repetition')) {
      const rangeMatch = t.match(/(?:versets?|du verset)\s*(\d+)\s*(?:à|a|au verset|au)\s*(\d+)/);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1]), end = parseInt(rangeMatch[2]);
        let count = 3;
        if (t.includes('infini') || t.includes('boucle') || t.includes('sans fin')) count = 0;
        else { const cm = t.match(/(\d+)\s*fois/); if (cm) count = parseInt(cm[1]); }
        options.onRepeatRange?.(start, end, count);
        return `Répétition des versets ${start} à ${end} (${count === 0 ? '∞' : count + 'x'})`;
      }
      let repeatCount = 3;
      if (t.includes('infini') || t.includes('boucle') || t.includes('sans fin')) repeatCount = 0;
      else {
        const cm = t.match(/(\d+)\s*fois/);
        if (cm) repeatCount = parseInt(cm[1]);
        else {
          const fc: Record<string, number> = { 'trois': 3, 'cinq': 5, 'dix': 10, 'deux': 2, 'quatre': 4, 'six': 6, 'sept': 7, 'huit': 8, 'neuf': 9 };
          for (const [w, n] of Object.entries(fc)) { if (t.includes(w + ' fois')) { repeatCount = n; break; } }
        }
      }
      options.onRepeatVerse?.(repeatCount);
      return `Répétition du verset actuel (${repeatCount === 0 ? '∞' : repeatCount + 'x'})`;
    }

    return null;
  }, [options]);

  // ── Arabic command processing ──
  const processCommandAr = useCallback((text: string): string | null => {
    const t = text.trim();

    // Home / back
    if (t.includes('الرئيسية') || t.includes('رجوع') || t.includes('العودة')) {
      options.onGoHome?.(); return 'العودة للرئيسية';
    }
    // Play
    if (t.includes('تشغيل') || t.includes('اقرأ') || t.includes('شغل') || t.includes('ابدأ')) {
      options.onPlay?.(); return 'بدء التشغيل';
    }
    // Pause
    if (t.includes('توقف') || t.includes('إيقاف') || t.includes('وقف') || t.includes('أوقف')) {
      options.onPause?.(); return 'إيقاف مؤقت';
    }
    // Next
    if (t.includes('التالي') || t.includes('التالية') || t.includes('بعد')) {
      options.onNextVerse?.(); return 'الآية التالية';
    }
    // Previous
    if (t.includes('السابق') || t.includes('السابقة') || t.includes('قبل')) {
      options.onPreviousVerse?.(); return 'الآية السابقة';
    }

    // Surah navigation
    if (t.includes('سورة') || t.includes('انتقل')) {
      const n = parseArabicNumber(t);
      if (n && n >= 1 && n <= 114) { options.onNavigateToSurah?.(n); return `انتقل إلى سورة ${n}`; }
      for (const [name, num] of Object.entries(ARABIC_SURAH_NAMES)) {
        if (t.includes(name)) { options.onNavigateToSurah?.(num); return `انتقل إلى سورة ${name}`; }
      }
    }

    // Page navigation
    if (t.includes('صفحة')) {
      const n = parseArabicNumber(t);
      if (n && n >= 1 && n <= 604) { options.onNavigateToPage?.(n); return `انتقل إلى صفحة ${n}`; }
    }

    // Juz navigation
    if (t.includes('جزء') || t.includes('حزب')) {
      const n = parseArabicNumber(t);
      if (n && n >= 1 && n <= 30) { options.onNavigateToJuz?.(n); return `انتقل إلى جزء ${n}`; }
    }

    // Verse reading
    if (t.includes('آية') && !t.includes('كرر')) {
      const n = parseArabicNumber(t);
      if (n) { options.onReadVerse?.(n); return `قراءة الآية ${n}`; }
    }

    // Stop repetition
    if (t.includes('إيقاف التكرار') || t.includes('أوقف التكرار') || t.includes('توقف تكرار')) {
      options.onStopRepeat?.(); return 'إيقاف التكرار';
    }

    // Repeat
    if (t.includes('كرر') || t.includes('تكرار')) {
      // Range: "كرر الآيات 1 إلى 5"
      const rangeMatch = t.match(/(?:الآيات?|آيات?)\s*(\d+)\s*(?:إلى|الى|ل)\s*(\d+)/);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1]), end = parseInt(rangeMatch[2]);
        let count = 3;
        if (t.includes('لا نهاية') || t.includes('بلا نهاية')) count = 0;
        else { const cm = t.match(/(\d+)\s*(?:مرات|مرة)/); if (cm) count = parseInt(cm[1]); }
        options.onRepeatRange?.(start, end, count);
        return `تكرار الآيات ${start} إلى ${end} (${count === 0 ? '∞' : count + 'x'})`;
      }
      let repeatCount = 3;
      if (t.includes('لا نهاية') || t.includes('بلا نهاية')) repeatCount = 0;
      else {
        const cm = t.match(/(\d+)\s*(?:مرات|مرة)/);
        if (cm) repeatCount = parseInt(cm[1]);
        else {
          for (const [w, n] of Object.entries(ARABIC_NUMBERS)) {
            if (t.includes(w + ' مر')) { repeatCount = n; break; }
          }
        }
      }
      options.onRepeatVerse?.(repeatCount);
      return `تكرار الآية (${repeatCount === 0 ? '∞' : repeatCount + 'x'})`;
    }

    return null;
  }, [options]);

  const processCommand = useCallback((text: string) => {
    setLastCommand(text.toLowerCase().trim());
    return voiceLang === 'ar' ? processCommandAr(text) : processCommandFr(text);
  }, [voiceLang, processCommandAr, processCommandFr]);

  const containsWakeWord = useCallback((text: string) => {
    const lower = text.toLowerCase().trim();
    return getWakeWords().some(w => lower.includes(w));
  }, [getWakeWords]);

  const processContinuousText = useCallback((text: string) => {
    const lower = text.toLowerCase().trim();

    if (isAwaitingCommand) {
      const result = processCommand(text);
      if (result) {
        setIsAwaitingCommand(false);
        if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
        return result;
      }
    }

    if (containsWakeWord(lower)) {
      let commandPart = lower;
      for (const word of getWakeWords()) commandPart = commandPart.replace(word, '').trim();
      if (commandPart.length > 2) return processCommand(commandPart);
      setIsAwaitingCommand(true);
      if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
      commandTimeoutRef.current = setTimeout(() => setIsAwaitingCommand(false), 5000);
      return voiceLang === 'ar' ? 'جاري الاستماع...' : 'Écoute...';
    }

    // Direct commands without wake word
    const directFr = ['jouer', 'play', 'pause', 'stop', 'suivant', 'précédent', 'arrêter'];
    const directAr = ['تشغيل', 'توقف', 'إيقاف', 'التالي', 'السابق', 'شغل'];
    const directCmds = voiceLang === 'ar' ? directAr : directFr;
    if (directCmds.some(cmd => lower.includes(cmd))) return processCommand(text);

    return null;
  }, [isAwaitingCommand, processCommand, containsWakeWord, getWakeWords, voiceLang]);

  const startListening = useCallback((continuous: boolean = false) => {
    if (!isSupported) return;
    if (ttsSuspendedRef.current) return;

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = getRecognitionLang();

    recognition.onstart = () => { setIsListening(true); };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const current = event.resultIndex;
      const result = event.results[current];
      const transcriptText = result[0].transcript;
      setTranscript(transcriptText);
      if (result.isFinal) {
        if (continuous || shouldRestartRef.current) {
          processContinuousText(transcriptText);
        } else {
          processCommand(transcriptText);
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setIsListening(false);
        shouldRestartRef.current = false;
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (shouldRestartRef.current && !ttsSuspendedRef.current) {
        setTimeout(() => {
          if (shouldRestartRef.current) startListening(true);
        }, 300);
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch {}
  }, [isSupported, processCommand, processContinuousText, getRecognitionLang]);

  // TTS suspend/resume
  useEffect(() => {
    const onTtsStart = () => {
      resumeContinuousAfterTtsRef.current = shouldRestartRef.current;
      ttsSuspendedRef.current = true;
      shouldRestartRef.current = false;
      if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} }
      setIsListening(false);
    };
    const onTtsEnd = () => {
      const shouldResume = resumeContinuousAfterTtsRef.current;
      ttsSuspendedRef.current = false;
      resumeContinuousAfterTtsRef.current = false;
      if (shouldResume) {
        shouldRestartRef.current = true;
        setIsContinuousMode(true);
        setTimeout(() => {
          if (shouldRestartRef.current && !ttsSuspendedRef.current) startListening(true);
        }, 350);
      }
    };
    window.addEventListener('app:tts-start', onTtsStart as EventListener);
    window.addEventListener('app:tts-end', onTtsEnd as EventListener);
    return () => {
      window.removeEventListener('app:tts-start', onTtsStart as EventListener);
      window.removeEventListener('app:tts-end', onTtsEnd as EventListener);
    };
  }, [startListening]);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    if (recognitionRef.current) { recognitionRef.current.stop(); setIsListening(false); }
    if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
    setIsAwaitingCommand(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) stopListening(); else startListening(false);
  }, [isListening, startListening, stopListening]);

  const enableContinuousMode = useCallback(() => {
    setIsContinuousMode(true);
    shouldRestartRef.current = true;
    startListening(true);
  }, [startListening]);

  const disableContinuousMode = useCallback(() => {
    setIsContinuousMode(false);
    shouldRestartRef.current = false;
    stopListening();
  }, [stopListening]);

  const toggleContinuousMode = useCallback(() => {
    if (isContinuousMode) disableContinuousMode(); else enableContinuousMode();
  }, [isContinuousMode, enableContinuousMode, disableContinuousMode]);

  // Auto-enable continuous mode on mount
  useEffect(() => {
    if (isSupported) {
      const timer = setTimeout(() => {
        setIsContinuousMode(true);
        shouldRestartRef.current = true;
        startListening(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    return () => { if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current); };
  }, []);

  return {
    isListening,
    isContinuousMode,
    isAwaitingCommand,
    transcript,
    isSupported,
    lastCommand,
    voiceLang,
    setVoiceLang,
    startListening,
    stopListening,
    toggleListening,
    enableContinuousMode,
    disableContinuousMode,
    toggleContinuousMode,
  };
};
