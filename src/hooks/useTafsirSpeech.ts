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
    synth.cancel();
    synth.resume();
    try {
      const voices = await loadTafsirVoices(synth);
      if (session.current !== id) return;
      const voice = selectTafsirVoice(voices, lang);
      // Never read Arabic using the device's French/English default voice.
      if (lang === 'ar' && !voice) {
        toast.error('لا يتوفر صوت عربي على هذا الجهاز. يرجى تثبيت صوت عربي من إعدادات تحويل النص إلى كلام.');
        finish();
        return;
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