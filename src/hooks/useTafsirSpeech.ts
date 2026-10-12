import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { configureTafsirUtterance, selectTafsirVoice, splitTafsirSpeech, type TafsirSpeechLang } from '@/lib/tafsirSpeech';
import { CloudSpeechError, fetchClip, splitCloudChunks } from '@/lib/cloudTafsirSpeech';

// Tiny silent WAV used to unlock the audio element inside the user's tap (mobile browsers).
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

export function useTafsirSpeech(scope: string) {
  const [speakingLang, setSpeakingLang] = useState<TafsirSpeechLang | null>(null);
  const [loading, setLoading] = useState(false);
  const session = useRef(0);
  const active = useRef(false);
  const current = useRef<SpeechSynthesisUtterance | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const abort = useRef<AbortController | null>(null);
  const urls = useRef<string[]>([]);

  const finish = useCallback(() => {
    setSpeakingLang(null);
    setLoading(false);
    current.current = null;
    urls.current.forEach(u => URL.revokeObjectURL(u));
    urls.current = [];
    if (active.current) {
      active.current = false;
      window.dispatchEvent(new CustomEvent('app:tts-end'));
    }
  }, []);
  const stop = useCallback(() => {
    session.current += 1;
    abort.current?.abort();
    abort.current = null;
    if (audio.current) { audio.current.pause(); audio.current.onended = null; }
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

  const toggle = (lang: TafsirSpeechLang, text: string) => {
    if (speakingLang === lang) { stop(); return; }
    stop();
    if (!text.trim()) return;
    const id = ++session.current;
    active.current = true;
    setSpeakingLang(lang);
    setLoading(true);
    window.dispatchEvent(new CustomEvent('app:tts-start'));

    const el = audio.current ?? (audio.current = new Audio());
    el.src = SILENT;
    el.play().catch(() => { /* unlock attempt only */ });

    const ctrl = new AbortController();
    abort.current = ctrl;
    const chunks = splitCloudChunks(text);
    const clips = chunks.map((_, i) => i < 2 ? fetchClip(chunks[i], lang, ctrl.signal) : null);
    const getClipAt = (i: number) => clips[i] ??= fetchClip(chunks[i], lang, ctrl.signal);
    clips.forEach(p => p?.catch(() => {}));

    const play = async (i: number) => {
      if (session.current !== id) return;
      if (i >= chunks.length) { finish(); return; }
      try {
        const blob = await getClipAt(i);
        if (session.current !== id) return;
        if (i + 1 < chunks.length) getClipAt(i + 1).catch(() => {});
        const url = URL.createObjectURL(blob);
        urls.current.push(url);
        el.src = url;
        el.onended = () => play(i + 1);
        setLoading(false);
        await el.play();
      } catch (e) {
        if (session.current !== id || ctrl.signal.aborted) return;
        if (e instanceof CloudSpeechError) {
          if (e.status === 402 || e.status === 403) { toast.error(e.message); finish(); return; }
        }
        // Offline or temporary failure: continue with the device voice.
        if (i === 0) toast.info('تعذّر الصوت السحابي، تُستعمل قراءة الجهاز');
        setLoading(false);
        speakWithDevice(id, lang, chunks.slice(i).join(' '));
      }
    };
    play(0);
  };
  return { speakingLang, loading, toggle, stop };
}
