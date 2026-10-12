import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { configureTafsirUtterance, selectTafsirVoice, splitTafsirSpeech, type TafsirSpeechLang } from '@/lib/tafsirSpeech';
import { CloudSpeechError, PcmPlayer, playCloudChunk, splitCloudChunks } from '@/lib/cloudTafsirSpeech';

export function useTafsirSpeech(scope: string) {
  const [speakingLang, setSpeakingLang] = useState<TafsirSpeechLang | null>(null);
  const [loading, setLoading] = useState(false);
  const session = useRef(0);
  const active = useRef(false);
  const current = useRef<SpeechSynthesisUtterance | null>(null);
  const player = useRef<PcmPlayer | null>(null);
  const abort = useRef<AbortController | null>(null);

  const finish = useCallback(() => {
    setSpeakingLang(null);
    setLoading(false);
    current.current = null;
    player.current?.close();
    player.current = null;
    if (active.current) {
      active.current = false;
      window.dispatchEvent(new CustomEvent('app:tts-end'));
    }
  }, []);
  const stop = useCallback(() => {
    session.current += 1;
    abort.current?.abort();
    abort.current = null;
    if (active.current) window.speechSynthesis?.cancel();
    finish();
  }, [finish]);
  useEffect(() => stop, [scope, stop]);

  const speakWithDevice = (id: number, lang: TafsirSpeechLang, text: string) => {
    const synth = window.speechSynthesis;
    if (!synth) { toast.error('القراءة الصوتية غير مدعومة في هذا المتصفح'); finish(); return; }
    const voice = selectTafsirVoice(synth.getVoices(), lang);
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

  // Synchronous start: the AudioContext is created inside the user's tap (required on mobile).
  const toggle = (lang: TafsirSpeechLang, text: string) => {
    if (speakingLang === lang) { stop(); return; }
    stop();
    if (!text.trim()) return;
    const id = ++session.current;
    active.current = true;
    setSpeakingLang(lang);
    setLoading(true);
    window.dispatchEvent(new CustomEvent('app:tts-start'));

    let p: PcmPlayer;
    try { p = new PcmPlayer(); } catch { speakWithDevice(id, lang, text); setLoading(false); return; }
    player.current = p;
    const ctrl = new AbortController();
    abort.current = ctrl;
    const chunks = splitCloudChunks(text);

    (async () => {
      for (let i = 0; i < chunks.length; i++) {
        if (session.current !== id) return;
        try {
          await playCloudChunk(chunks[i], lang, p, ctrl.signal, () => setLoading(false));
        } catch (e) {
          if (session.current !== id || ctrl.signal.aborted) return;
          console.warn('[tafsir-tts]', e);
          if (e instanceof CloudSpeechError && (e.status === 402 || e.status === 403)) {
            toast.error(e.message); finish(); return;
          }
          // Offline or temporary failure: continue with the device voice.
          toast.info('تعذّر الصوت السحابي، تُستعمل قراءة الجهاز');
          await p.drained(ctrl.signal);
          if (session.current !== id) return;
          setLoading(false);
          speakWithDevice(id, lang, chunks.slice(i).join(' '));
          return;
        }
      }
      await p.drained(ctrl.signal);
      if (session.current === id) finish();
    })();
  };
  return { speakingLang, loading, toggle, stop };
}
