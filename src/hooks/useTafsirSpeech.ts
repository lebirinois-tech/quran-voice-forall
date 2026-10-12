import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { configureTafsirUtterance, loadTafsirVoices, selectTafsirVoice, splitTafsirSpeech, type TafsirSpeechLang } from '@/lib/tafsirSpeech';

export function useTafsirSpeech(scope: string) {
  const [speakingLang, setSpeakingLang] = useState<TafsirSpeechLang | null>(null);
  const session = useRef(0);
  const active = useRef(false);
  const finish = useCallback(() => {
    setSpeakingLang(null);
    if (active.current) {
      active.current = false;
      window.dispatchEvent(new CustomEvent('app:tts-end'));
    }
  }, []);
  const stop = useCallback(() => {
    session.current += 1;
    if (active.current) window.speechSynthesis?.cancel();
    finish();
  }, [finish]);
  useEffect(() => stop, [scope, stop]);

  const toggle = async (lang: TafsirSpeechLang, text: string) => {
    if (speakingLang === lang) { stop(); return; }
    stop();
    if (!window.speechSynthesis || !text.trim()) return;
    const id = ++session.current;
    const synth = window.speechSynthesis;
    active.current = true;
    setSpeakingLang(lang);
    window.dispatchEvent(new CustomEvent('app:tts-start'));
    try {
      const voices = await loadTafsirVoices(synth);
      if (session.current !== id) return;
      const voice = selectTafsirVoice(voices, lang);
      // Prefer an Arabic voice, but never stay silent: some devices expose
      // Arabic TTS without listing it in getVoices(), so speak anyway with
      // the ar-SA locale and let the engine pick its Arabic voice.
      if (lang === 'ar' && !voice) {
        toast.info('سيُقرأ التفسير بالصوت الافتراضي للجهاز. لصوت عربي أفضل، ثبّت صوتًا عربيًا من إعدادات تحويل النص إلى كلام.');
      }
      const chunks = splitTafsirSpeech(text);
      let index = 0;
      const next = () => {
        if (session.current !== id) return;
        const chunk = chunks[index++];
        if (!chunk) { finish(); return; }
        const utterance = new SpeechSynthesisUtterance(chunk);
        configureTafsirUtterance(utterance, lang, voice);
        utterance.onend = next;
        utterance.onerror = () => { if (session.current === id) finish(); };
        synth.speak(utterance);
      };
      next();
    } catch {
      if (session.current === id) finish();
    }
  };
  return { speakingLang, toggle, stop };
}