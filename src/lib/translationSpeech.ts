/**
 * Translation text-to-speech using the browser's native Web Speech API.
 * Free, offline-capable, supports male voices in French & English.
 */

let cachedVoices: SpeechSynthesisVoice[] | null = null;

const loadVoices = (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise((resolve) => {
    if (cachedVoices && cachedVoices.length > 0) {
      resolve(cachedVoices);
      return;
    }
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      cachedVoices = voices;
      resolve(voices);
      return;
    }
    // Some browsers load voices asynchronously
    const handler = () => {
      cachedVoices = window.speechSynthesis.getVoices();
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve(cachedVoices);
    };
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    // Fallback timeout
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1000);
  });
};

/**
 * Pick the best male voice for a given language.
 * Falls back to any voice matching the language if no male voice is detected.
 */
const pickMaleVoice = (voices: SpeechSynthesisVoice[], langPrefix: string): SpeechSynthesisVoice | null => {
  const langVoices = voices.filter(v => v.lang.toLowerCase().startsWith(langPrefix));
  if (langVoices.length === 0) return null;

  // Heuristic: voice names containing male indicators
  const maleIndicators = [
    'male', 'homme', 'man', 'guy',
    // Common male voice names by platform
    'daniel', 'thomas', 'nicolas', 'paul', 'henri', 'jacques',
    'alex', 'fred', 'tom', 'david', 'mark', 'george', 'james',
    'google français', 'google uk english male', 'google us english',
    'microsoft paul', 'microsoft henri', 'microsoft mark', 'microsoft david',
    'microsoft guy', 'microsoft brian', 'microsoft eric',
  ];

  const maleVoice = langVoices.find(v => {
    const name = v.name.toLowerCase();
    return maleIndicators.some(indicator => name.includes(indicator));
  });

  return maleVoice || langVoices[0];
};

export type TranslationLang = 'fr' | 'en';

export interface SpeakOptions {
  text: string;
  lang: TranslationLang;
  rate?: number;
  onEnd?: () => void;
  onError?: (err: string) => void;
}

export const isSpeechSupported = (): boolean => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
};

export const speakTranslation = async ({
  text,
  lang,
  rate = 0.95,
  onEnd,
  onError,
}: SpeakOptions): Promise<void> => {
  if (!isSpeechSupported()) {
    onError?.('Speech synthesis non supportée');
    return;
  }

  // Always cancel current utterance before starting a new one
  window.speechSynthesis.cancel();

  const voices = await loadVoices();
  const langCode = lang === 'fr' ? 'fr-FR' : 'en-US';
  const voice = pickMaleVoice(voices, lang);

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langCode;
  utterance.rate = rate;
  utterance.pitch = 0.9; // Slightly lower pitch for male feel
  if (voice) utterance.voice = voice;

  utterance.onend = () => onEnd?.();
  utterance.onerror = (e) => onError?.(e.error || 'Erreur de lecture');

  window.speechSynthesis.speak(utterance);
};

export const stopSpeech = (): void => {
  if (isSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
};