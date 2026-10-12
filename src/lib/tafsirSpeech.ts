export type TafsirSpeechLang = 'ar' | 'fr' | 'en';

const locales: Record<TafsirSpeechLang, string> = { ar: 'ar-SA', fr: 'fr-FR', en: 'en-US' };

/** Browser voices do not expose gender; prefer known male Arabic voice names. */
export function selectTafsirVoice(voices: SpeechSynthesisVoice[], lang: TafsirSpeechLang) {
  const candidates = voices.filter(voice => voice.lang.toLowerCase().split(/[-_]/)[0] === lang);
  if (lang !== 'ar') return candidates.find(voice => voice.lang === locales[lang]) ?? candidates[0];
  const score = (voice: SpeechSynthesisVoice) => {
    const male = /\b(naayf|nayef|hamdan|hamed|bassel|tarik|maged|majed|male)\b|نايف|حمدان|حامد|باسل|طارق|ماجد/i.test(voice.name);
    return (male ? 100 : 0) + (voice.lang.toLowerCase().replace('_', '-') === 'ar-sa' ? 10 : 0);
  };
  return candidates.slice().sort((a, b) => score(b) - score(a))[0];
}

export function loadTafsirVoices(synth: SpeechSynthesis): Promise<SpeechSynthesisVoice[]> {
  const voices = synth.getVoices();
  if (voices.length) return Promise.resolve(voices);
  return new Promise(resolve => {
    const finish = () => {
      const available = synth.getVoices();
      if (!available.length) return;
      cleanup();
      resolve(available);
    };
    const timeout = window.setTimeout(() => { cleanup(); resolve(synth.getVoices()); }, 1200);
    const cleanup = () => {
      window.clearTimeout(timeout);
      synth.removeEventListener('voiceschanged', finish);
    };
    synth.addEventListener('voiceschanged', finish);
    finish();
  });
}

/** Keep Arabic vowels and punctuation intact, including pauses at Arabic commas. */
export function splitTafsirSpeech(text: string, maxLength = 220): string[] {
  const sentences = text.replace(/\s+/g, ' ').trim().match(/[^.!?؟؛،。]+[.!?؟؛،。]*/gu) ?? [];
  const chunks: string[] = [];
  for (const sentence of sentences) {
    let buffer = '';
    for (const word of sentence.trim().split(' ')) {
      if (buffer && buffer.length + word.length + 1 > maxLength) {
        chunks.push(buffer);
        buffer = '';
      }
      buffer = buffer ? `${buffer} ${word}` : word;
    }
    if (buffer) chunks.push(buffer);
  }
  return chunks;
}

export function configureTafsirUtterance(utterance: SpeechSynthesisUtterance, lang: TafsirSpeechLang, voice?: SpeechSynthesisVoice) {
  utterance.lang = voice?.lang ?? locales[lang];
  if (voice) utterance.voice = voice;
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.volume = 1;
}