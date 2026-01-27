import { useState, useEffect, useCallback, useRef } from 'react';

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

export const useVoiceCommands = (options: VoiceCommandsOptions) => {
  const [isListening, setIsListening] = useState(false);
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [isAwaitingCommand, setIsAwaitingCommand] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldRestartRef = useRef(false);
  const commandTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Wake words to activate command mode
  const WAKE_WORDS = ['coran', 'quran', 'ok coran', 'hey coran'];

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const processCommand = useCallback((text: string) => {
    const lowerText = text.toLowerCase().trim();
    setLastCommand(lowerText);

    // Navigation commands
    if (lowerText.includes('accueil') || lowerText.includes('home') || lowerText.includes('retour')) {
      options.onGoHome?.();
      return 'Navigation vers l\'accueil';
    }

    // Play/Pause commands
    if (lowerText.includes('jouer') || lowerText.includes('play') || lowerText.includes('lire') || lowerText.includes('lecture')) {
      options.onPlay?.();
      return 'Lecture démarrée';
    }

    if (lowerText.includes('pause') || lowerText.includes('stop') || lowerText.includes('arrêter') || lowerText.includes('arrête')) {
      options.onPause?.();
      return 'Lecture en pause';
    }

    // Next/Previous commands
    if (lowerText.includes('suivant') || lowerText.includes('next') || lowerText.includes('prochain')) {
      options.onNextVerse?.();
      return 'Verset suivant';
    }

    if (lowerText.includes('précédent') || lowerText.includes('previous') || lowerText.includes('avant')) {
      options.onPreviousVerse?.();
      return 'Verset précédent';
    }

    // Surah navigation - French numbers
    const frenchNumbers: Record<string, number> = {
      'un': 1, 'une': 1, 'premier': 1, 'première': 1,
      'deux': 2, 'deuxième': 2,
      'trois': 3, 'troisième': 3,
      'quatre': 4, 'quatrième': 4,
      'cinq': 5, 'cinquième': 5,
      'six': 6, 'sixième': 6,
      'sept': 7, 'septième': 7,
      'huit': 8, 'huitième': 8,
      'neuf': 9, 'neuvième': 9,
      'dix': 10, 'dixième': 10,
      'onze': 11, 'douze': 12,
      'trente-six': 36, 'trente six': 36,
      'cinquante-cinq': 55, 'cinquante cinq': 55,
      'soixante-sept': 67, 'soixante sept': 67,
      'cent-douze': 112, 'cent douze': 112,
      'cent-treize': 113, 'cent treize': 113,
      'cent-quatorze': 114, 'cent quatorze': 114,
    };

    // Surah by name
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

    // Check for surah command
    if (lowerText.includes('sourate') || lowerText.includes('surah') || lowerText.includes('aller')) {
      // Try to find number in text
      const numberMatch = lowerText.match(/\d+/);
      if (numberMatch) {
        const surahNum = parseInt(numberMatch[0]);
        if (surahNum >= 1 && surahNum <= 114) {
          options.onNavigateToSurah?.(surahNum);
          return `Navigation vers sourate ${surahNum}`;
        }
      }

      // Try French numbers
      for (const [word, num] of Object.entries(frenchNumbers)) {
        if (lowerText.includes(word)) {
          options.onNavigateToSurah?.(num);
          return `Navigation vers sourate ${num}`;
        }
      }

      // Try surah names
      for (const [name, num] of Object.entries(surahNames)) {
        if (lowerText.includes(name)) {
          options.onNavigateToSurah?.(num);
          return `Navigation vers ${name}`;
        }
      }
    }

    // Page navigation
    if (lowerText.includes('page')) {
      const pageMatch = lowerText.match(/page\s*(\d+)/);
      if (pageMatch) {
        const pageNum = parseInt(pageMatch[0].match(/\d+/)![0]);
        if (pageNum >= 1 && pageNum <= 604) {
          options.onNavigateToPage?.(pageNum);
          return `Navigation vers page ${pageNum}`;
        }
      }
      
      // French numbers for pages
      const frenchPageNumbers: Record<string, number> = {
        'un': 1, 'une': 1, 'premier': 1, 'première': 1,
        'deux': 2, 'trois': 3, 'quatre': 4, 'cinq': 5,
        'six': 6, 'sept': 7, 'huit': 8, 'neuf': 9, 'dix': 10,
        'vingt': 20, 'trente': 30, 'quarante': 40, 'cinquante': 50,
        'soixante': 60, 'cent': 100, 'deux cent': 200, 'trois cent': 300,
      };
      
      for (const [word, num] of Object.entries(frenchPageNumbers)) {
        if (lowerText.includes(word)) {
          options.onNavigateToPage?.(num);
          return `Navigation vers page ${num}`;
        }
      }
    }

    // Juz navigation
    if (lowerText.includes('juz') || lowerText.includes('partie') || lowerText.includes('hizb')) {
      const juzMatch = lowerText.match(/\d+/);
      if (juzMatch) {
        const juzNum = parseInt(juzMatch[0]);
        if (juzNum >= 1 && juzNum <= 30) {
          options.onNavigateToJuz?.(juzNum);
          return `Navigation vers Juz ${juzNum}`;
        }
      }
      
      // French numbers for Juz
      const frenchJuzNumbers: Record<string, number> = {
        'un': 1, 'une': 1, 'premier': 1, 'première': 1,
        'deux': 2, 'deuxième': 2, 'trois': 3, 'troisième': 3,
        'quatre': 4, 'cinq': 5, 'six': 6, 'sept': 7, 'huit': 8,
        'neuf': 9, 'dix': 10, 'onze': 11, 'douze': 12, 'treize': 13,
        'quatorze': 14, 'quinze': 15, 'seize': 16, 'dix-sept': 17,
        'dix-huit': 18, 'dix-neuf': 19, 'vingt': 20, 'vingt-et-un': 21,
        'vingt-deux': 22, 'vingt-trois': 23, 'vingt-quatre': 24,
        'vingt-cinq': 25, 'vingt-six': 26, 'vingt-sept': 27,
        'vingt-huit': 28, 'vingt-neuf': 29, 'trente': 30,
      };
      
      for (const [word, num] of Object.entries(frenchJuzNumbers)) {
        if (lowerText.includes(word)) {
          options.onNavigateToJuz?.(num);
          return `Navigation vers Juz ${num}`;
        }
      }
    }

    // Verse reading
    if (lowerText.includes('verset') && !lowerText.includes('répéter') && !lowerText.includes('repeter')) {
      const verseMatch = lowerText.match(/verset\s*(\d+)/);
      if (verseMatch) {
        const verseNum = parseInt(verseMatch[1]);
        options.onReadVerse?.(verseNum);
        return `Lecture du verset ${verseNum}`;
      }
    }

    // Stop repetition commands
    if (lowerText.includes('arrêter répétition') || lowerText.includes('arreter repetition') || 
        lowerText.includes('stop répétition') || lowerText.includes('stop repetition') ||
        lowerText.includes('désactiver répétition') || lowerText.includes('desactiver repetition')) {
      options.onStopRepeat?.();
      return 'Répétition désactivée';
    }

    // Repeat verse commands - "répéter verset 3 fois", "répéter 5 fois", "répéter infini"
    if (lowerText.includes('répéter') || lowerText.includes('repeter') || 
        lowerText.includes('répétition') || lowerText.includes('repetition')) {
      
      // Check for range repetition: "répéter versets 1 à 5" or "répéter du verset 1 au verset 5"
      const rangeMatch = lowerText.match(/(?:versets?|du verset)\s*(\d+)\s*(?:à|a|au verset|au)\s*(\d+)/);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1]);
        const end = parseInt(rangeMatch[2]);
        
        // Check for count
        let count = 3; // default
        if (lowerText.includes('infini') || lowerText.includes('boucle') || lowerText.includes('sans fin')) {
          count = 0;
        } else {
          const countMatch = lowerText.match(/(\d+)\s*fois/);
          if (countMatch) {
            count = parseInt(countMatch[1]);
          }
        }
        
        options.onRepeatRange?.(start, end, count);
        return `Répétition des versets ${start} à ${end} (${count === 0 ? '∞' : count + 'x'})`;
      }
      
      // Single verse repetition
      let repeatCount = 3; // default
      
      // Check for infinite
      if (lowerText.includes('infini') || lowerText.includes('boucle') || lowerText.includes('sans fin')) {
        repeatCount = 0;
      } else {
        // Check for specific count: "3 fois", "5 fois", "10 fois"
        const countMatch = lowerText.match(/(\d+)\s*fois/);
        if (countMatch) {
          repeatCount = parseInt(countMatch[1]);
        } else {
          // Check for French number words
          const frenchCounts: Record<string, number> = {
            'trois': 3, 'cinq': 5, 'dix': 10,
            'deux': 2, 'quatre': 4, 'six': 6,
            'sept': 7, 'huit': 8, 'neuf': 9,
          };
          for (const [word, num] of Object.entries(frenchCounts)) {
            if (lowerText.includes(word + ' fois')) {
              repeatCount = num;
              break;
            }
          }
        }
      }
      
      options.onRepeatVerse?.(repeatCount);
      return `Répétition du verset actuel (${repeatCount === 0 ? '∞' : repeatCount + 'x'})`;
    }

    return null;
  }, [options]);

  // Check if text contains a wake word
  const containsWakeWord = useCallback((text: string) => {
    const lowerText = text.toLowerCase().trim();
    return WAKE_WORDS.some(word => lowerText.includes(word));
  }, []);

  // Process text in continuous mode - check for wake word or direct command
  const processContinuousText = useCallback((text: string) => {
    const lowerText = text.toLowerCase().trim();
    
    // If awaiting command after wake word, process the command
    if (isAwaitingCommand) {
      const result = processCommand(text);
      if (result) {
        setIsAwaitingCommand(false);
        if (commandTimeoutRef.current) {
          clearTimeout(commandTimeoutRef.current);
        }
        return result;
      }
    }
    
    // Check for wake word
    if (containsWakeWord(lowerText)) {
      // Remove wake word and check if there's a command after it
      let commandPart = lowerText;
      for (const word of WAKE_WORDS) {
        commandPart = commandPart.replace(word, '').trim();
      }
      
      if (commandPart.length > 2) {
        // There's a command after the wake word
        return processCommand(commandPart);
      } else {
        // Just wake word, wait for command
        setIsAwaitingCommand(true);
        // Reset after 5 seconds if no command
        if (commandTimeoutRef.current) {
          clearTimeout(commandTimeoutRef.current);
        }
        commandTimeoutRef.current = setTimeout(() => {
          setIsAwaitingCommand(false);
        }, 5000);
        return 'Écoute...';
      }
    }
    
    // In continuous mode, also try to detect direct commands for convenience
    // This allows commands like "jouer", "pause" without wake word
    const directCommands = ['jouer', 'play', 'pause', 'stop', 'suivant', 'précédent', 'arrêter'];
    if (directCommands.some(cmd => lowerText.includes(cmd))) {
      return processCommand(text);
    }
    
    return null;
  }, [isAwaitingCommand, processCommand, containsWakeWord]);

  const startListening = useCallback((continuous: boolean = false) => {
    if (!isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = 'fr-FR';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const current = event.resultIndex;
      const result = event.results[current];
      const transcriptText = result[0].transcript;
      setTranscript(transcriptText);

      if (result.isFinal) {
        if (isContinuousMode || continuous) {
          processContinuousText(transcriptText);
        } else {
          processCommand(transcriptText);
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      // Don't stop continuous mode on transient errors
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setIsListening(false);
        shouldRestartRef.current = false;
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart in continuous mode
      if (shouldRestartRef.current && isContinuousMode) {
        setTimeout(() => {
          if (shouldRestartRef.current) {
            startListening(true);
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, processCommand, processContinuousText, isContinuousMode]);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    if (commandTimeoutRef.current) {
      clearTimeout(commandTimeoutRef.current);
    }
    setIsAwaitingCommand(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening(false);
    }
  }, [isListening, startListening, stopListening]);

  // Enable/disable continuous listening mode
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
    if (isContinuousMode) {
      disableContinuousMode();
    } else {
      enableContinuousMode();
    }
  }, [isContinuousMode, enableContinuousMode, disableContinuousMode]);

  // Auto-enable continuous mode on mount for maximum accessibility
  useEffect(() => {
    if (isSupported) {
      // Small delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        enableContinuousMode();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isSupported]); // Only run once on mount when supported

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (commandTimeoutRef.current) {
        clearTimeout(commandTimeoutRef.current);
      }
    };
  }, []);

  return {
    isListening,
    isContinuousMode,
    isAwaitingCommand,
    transcript,
    isSupported,
    lastCommand,
    startListening,
    stopListening,
    toggleListening,
    enableContinuousMode,
    disableContinuousMode,
    toggleContinuousMode,
  };
};
