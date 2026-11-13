import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { configureTafsirUtterance, loadTafsirVoices, selectTafsirVoice, splitTafsirSpeech, type TafsirSpeechLang } from '@/lib/tafsirSpeech';

export function useTafsirSpeech(scope: string) {
  const [speakingLang, setSpeakingLang] = useState<TafsirSpeechLang | null>(null);
  const [loading, setLoading] = useState(false);
  const session = useRef(0);
  const active = useRef(false);
  const current = useRef<SpeechSynthesisUtterance | null>(null);

  const finish = useCallback(() => {
    setSpeakingLang(null);
    setLoading(false);
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

  const speakWithDevice = async (id: number, lang: TafsirSpeechLang, text: string) => {
    const synth = window.speechSynthesis;
    if (!synth) { toast.error('القراءة الصوتية غير مدعومة في هذا المتصفح'); finish(); return; }
    const voice = selectTafsirVoice(await loadTafsirVoices(synth), lang);
    if (session.current !== id) return;
    setLoading(false);
    if (!voice) { toast.error(lang === 'ar' ? 'يرجى تثبيت صوت عربي في إعدادات الجهاز' : lang === 'fr' ? 'Installez une voix française dans les réglages de votre appareil.' : 'Install an English voice in your device settings.'); finish(); return; }
    const chunks = splitTafsirSpeech(text);
    let index = 0;
    const next = () => {
      if (session.current !== id) return;
      const chunk = chunks[index++];
      if (!chunk) { finish(); return; }
      const u = new SpeechSynthesisUtterance(chunk);
      configureTafsirUtterance(u, lang, voice);
      u.onend = next;
      u.onerror = (e) => { if (session.current === id && e.error !== 'interrupted' && e.error !== 'canceled') next(); };
      current.current = u;
      synth.speak(u);
      synth.resume();
    };
    next();
  };

  // Device speech only: no metered speech requests, including for signed-in readers.
  const toggle = (lang: TafsirSpeechLang, text: string) => {
    if (speakingLang === lang) { stop(); return; }
    stop();
    if (!text.trim()) return;
    const id = ++session.current;
    active.current = true;
    setSpeakingLang(lang);
    setLoading(true);
    window.dispatchEvent(new CustomEvent('app:tts-start'));

    void speakWithDevice(id, lang, text);
  };
  return { speakingLang, loading, toggle, stop };
}
