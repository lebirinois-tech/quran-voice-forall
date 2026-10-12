import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { configureTafsirUtterance, selectTafsirVoice, splitTafsirSpeech, type TafsirSpeechLang } from '@/lib/tafsirSpeech';

export function useTafsirSpeech(scope: string) {
  const [speakingLang, setSpeakingLang] = useState<TafsirSpeechLang | null>(null);
  const session = useRef(0);
  const active = useRef(false);
  // Keep a reference so the browser does not garbage-collect the utterance mid-speech.
  const current = useRef<SpeechSynthesisUtterance | null>(null);
  const finish = useCallback(() => {
    setSpeakingLang(null);
    current.current = null;
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

  // Synchronous so speak() runs inside the user's tap (required on mobile browsers).
  const toggle = (lang: TafsirSpeechLang, text: string) => {
    if (speakingLang === lang) { stop(); return; }
    stop();
    const synth = window.speechSynthesis;
    if (!synth || !text.trim()) {
      if (!synth) toast.error('القراءة الصوتية غير مدعومة في هذا المتصفح');
      return;
    }
    const id = ++session.current;
    active.current = true;
    setSpeakingLang(lang);
    window.dispatchEvent(new CustomEvent('app:tts-start'));
    const voice = selectTafsirVoice(synth.getVoices(), lang);
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
      utterance.onerror = (e) => {
        if (session.current !== id) return;
        if (e.error === 'interrupted' || e.error === 'canceled') return;
        next();
      };
      current.current = utterance;
      synth.speak(utterance);
      synth.resume();
    };
    next();
  };
  return { speakingLang, toggle, stop };
}
