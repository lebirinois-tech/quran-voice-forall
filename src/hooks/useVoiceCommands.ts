import { useState, useEffect, useCallback, useRef } from 'react';

interface VoiceCommandsOptions {
  onNavigateToSurah?: (surahNumber: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onNextVerse?: () => void;
  onPreviousVerse?: () => void;
  onGoHome?: () => void;
  onReadVerse?: (verseNumber: number) => void;
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
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

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

    // Verse reading
    if (lowerText.includes('verset')) {
      const verseMatch = lowerText.match(/verset\s*(\d+)/);
      if (verseMatch) {
        const verseNum = parseInt(verseMatch[1]);
        options.onReadVerse?.(verseNum);
        return `Lecture du verset ${verseNum}`;
      }
    }

    return null;
  }, [options]);

  const startListening = useCallback(() => {
    if (!isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
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
        processCommand(transcriptText);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, processCommand]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    transcript,
    isSupported,
    lastCommand,
    startListening,
    stopListening,
    toggleListening,
  };
};
