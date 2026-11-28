import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Mic, Square, RotateCcw, Loader2, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { surahs } from '@/data/surahs';
import { hafsDisplayText } from '@/lib/hafsDisplay';
import { applyAutoTajweed } from '@/lib/autoTajweed';
import { sanitizeTajweedHtml } from '@/lib/sanitize';
import { alignRecitation, recitationScore, type WordStatus } from '@/lib/hifzMatcher';
import { cn } from '@/lib/utils';
import { HifzPlanDashboard } from '@/components/HifzPlanDashboard';
import { useHifzPlan } from '@/contexts/HifzPlanContext';
import { createHifzEntry, loadHifzCorpus, scoreToGrade, type HifzCorpus } from '@/lib/hifzPlan';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { Input } from '@/components/ui/input';
import { resolveHifzRanges } from '@/lib/hifzPlan';
import { activeHifzGroup } from '@/lib/hifzPages';
import { startNativeHifzSpeech } from '@/lib/hifzNativeSpeech';

interface Word { surah: number; verse: number; page: number; text: string; html: string; endOfVerse: boolean }

const STATUS_CLASS: Record<WordStatus, string> = {
  pending: '',
  ok: 'bg-primary/15',
  approx: 'bg-accent/40 ring-1 ring-accent',
  wrong: 'bg-destructive/30 ring-2 ring-destructive',
  missed: 'bg-destructive/20 ring-1 ring-destructive line-through decoration-destructive',
};

const SpeechRecognitionCtor = typeof window !== 'undefined'
  ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  : undefined;

const HifzControl = () => {
  const plan = useHifzPlan();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'plan' ? 'plan' : 'control';
  const entryId = params.get('entry');
  const trackedEntry = plan.entries.find(e => e.id === entryId);
  const [corpus, setCorpus] = useState<HifzCorpus | null>(null);
  const [loadError, setLoadError] = useState('');
  const [reviewSaved, setReviewSaved] = useState(false);
  const initialSurah = (() => {
    const n = Number(new URLSearchParams(window.location.search).get('surah'));
    return Number.isInteger(n) && n >= 1 && n <= 114 ? n : 1;
  })();
  const [surah, setSurah] = useState(initialSurah);
  const initialPage = Number(params.get('page') ?? params.get('pageStart'));
  const validPage = Number.isInteger(initialPage) && initialPage >= 1 && initialPage <= 604;
  const [scope, setScope] = useState<'surah' | 'pages'>(validPage ? 'pages' : 'surah');
  const [pageStart, setPageStart] = useState(validPage ? initialPage : 1);
  const [pageEnd, setPageEnd] = useState(() => {
    const end = Number(params.get('pageEnd'));
    return validPage && Number.isInteger(end) && end >= initialPage && end <= 604 ? end : validPage ? initialPage : 1;
  });
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(() => Math.min(7, surahs.find((s) => s.number === initialSurah)?.versesCount ?? 7));
  const [mode, setMode] = useState<'verses' | 'pages'>('pages');
  const [listening, setListening] = useState(false);
  const [finished, setFinished] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const recRef = useRef<any>(null);
  const nativeAndroid = Capacitor.getPlatform() === 'android';
  const speechAvailable = nativeAndroid || !!SpeechRecognitionCtor;
  const nativeStopRef = useRef<(() => Promise<void>) | null>(null);
  const sessionRef = useRef(0);
  const [starting, setStarting] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const finalRef = useRef('');
  const wantRef = useRef(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioExt, setAudioExt] = useState('webm');
  const clearAudio = useCallback(() => { setAudioUrl(u => { if (u) URL.revokeObjectURL(u); return null; }); }, []);
  const startAudioCapture = async () => {
    try {
      if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!wantRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mr = new MediaRecorder(stream, { mimeType: mime });
      const chunks: Blob[] = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        if (chunks.length) { setAudioExt(mime === 'audio/mp4' ? 'm4a' : 'webm'); setAudioUrl(URL.createObjectURL(new Blob(chunks, { type: mime }))); }
      };
      mediaRef.current = mr; mr.start();
    } catch { toast.warning('L’enregistrement audio n’est pas disponible. Le contrôle vocal reste actif.'); }
  };
  const stopAudioCapture = () => { if (mediaRef.current?.state === 'recording') mediaRef.current.stop(); mediaRef.current = null; };
  const keepAudio = () => {
    if (!audioUrl) return;
    const a = document.createElement('a'); a.href = audioUrl; a.download = `controle-hifz-sourate-${surah}-${from}-${to}.${audioExt}`; a.click();
    toast.success('Enregistrement conservé sur l’appareil');
  };

  useEffect(() => { loadHifzCorpus().then(setCorpus).catch(() => setLoadError('Le texte ne peut pas être chargé. Reconnectez-vous puis réessayez.')); }, []);

  const versesCount = surahs.find((s) => s.number === surah)?.versesCount ?? 1;
  const ranges = useMemo(() => trackedEntry?.ranges ?? (entryId ? [] : scope === 'pages'
    ? corpus ? resolveHifzRanges(corpus, 'pages', pageStart, pageEnd) : []
    : [{ surah, from, to }]), [trackedEntry, entryId, scope, corpus, pageStart, pageEnd, surah, from, to]);
  const words = useMemo<Word[]>(() => {
    return ranges.flatMap(range => (corpus?.[String(range.surah)]?.arabic ?? [])
      .filter((v) => v.numberInSurah >= range.from && v.numberInSurah <= range.to)
      .flatMap((v) => {
        const parts = hafsDisplayText(v.text).split(/\s+/).filter(Boolean);
        return parts.map((p, i) => ({
          surah: range.surah, verse: v.numberInSurah, page: v.page, text: p,
          html: sanitizeTajweedHtml(applyAutoTajweed(p)), endOfVerse: i === parts.length - 1,
        }));
      }));
  }, [corpus, ranges]);

  const status = useMemo(
    () => alignRecitation(words.map((w) => w.text), transcript, finished),
    [words, transcript, finished],
  );
  const score = recitationScore(status);

  const reset = () => { clearAudio(); finalRef.current = ''; setTranscript(''); setFinished(false); setSelected(null); setReviewSaved(false); setSpeechError(''); };
  const saveResult = () => {
    if (reviewSaved) return;
    const matching = trackedEntry ?? plan.entries.find(e => JSON.stringify(e.ranges) === JSON.stringify(ranges));
    const saved = matching ? plan.review(matching.id, scoreToGrade(score), score) : (() => {
      const label = scope === 'pages' ? `Pages ${pageStart}–${pageEnd}` : `${surahs.find(s => s.number === surah)?.name} · versets ${from}–${to}`;
      const entry = createHifzEntry(label, ranges, scope, 'learning');
      // A new tested passage is added before recording its first review.
      return plan.save(entry) && plan.review(entry.id, scoreToGrade(score), score);
    })();
    if (saved) { setReviewSaved(true); toast.success('Résultat enregistré dans votre programme'); }
  };

  const stop = useCallback(() => {
    wantRef.current = false;
    sessionRef.current += 1;
    void nativeStopRef.current?.().catch(() => undefined);
    nativeStopRef.current = null;
    recRef.current?.stop();
    stopAudioCapture();
    setListening(false);
    setFinished(true);
  }, []);

  const start = async () => {
    if (!speechAvailable || starting || !words.length) return;
    reset();
    if (nativeAndroid) {
      const session = ++sessionRef.current;
      setStarting(true);
      wantRef.current = true;
      try {
        const stopNative = await startNativeHifzSpeech(text => {
          if (sessionRef.current === session) setTranscript(text);
        }, message => {
          if (sessionRef.current !== session) return;
          wantRef.current = false;
          setListening(false);
          setSpeechError(message);
        });
        if (sessionRef.current !== session) { await stopNative(); return; }
        nativeStopRef.current = stopNative;
        setListening(wantRef.current);
      } catch (error) {
        if (sessionRef.current === session) {
          wantRef.current = false;
          setSpeechError(error instanceof Error ? error.message : 'Impossible d’accéder au microphone Android.');
        }
      } finally { if (sessionRef.current === session) setStarting(false); }
      return;
    }
    if (!SpeechRecognitionCtor) return;
    const rec = new SpeechRecognitionCtor();
    rec.lang = 'ar-SA';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += ' ' + r[0].transcript;
        else interim += ' ' + r[0].transcript;
      }
      setTranscript(finalRef.current + interim);
    };
    // Browsers end sessions after silence; restart while the user is still reciting.
    rec.onend = () => { if (wantRef.current) { try { rec.start(); } catch { /* ignore */ } } };
    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed' || e.error === 'audio-capture') {
        wantRef.current = false; setListening(false); stopAudioCapture();
        setSpeechError(e.error === 'not-allowed' ? 'Autorisez le microphone pour utiliser le contrôle vocal.' : 'Aucun microphone utilisable détecté. Vérifiez son branchement.');
      }
    };
    recRef.current = rec;
    wantRef.current = true;
    try { rec.start(); } catch { wantRef.current = false; setSpeechError('Le microphone n’a pas pu démarrer. Réessayez.'); return; }
    void startAudioCapture();
    setListening(true);
  };

  useEffect(() => () => {
    sessionRef.current += 1; wantRef.current = false; recRef.current?.abort?.(); stopAudioCapture();
    void nativeStopRef.current?.().catch(() => undefined);
  }, []);
  useEffect(() => {
    if (listening && status.length && status[status.length - 1] !== 'pending') stop();
  }, [status, listening, stop]);

  const revealed = (i: number) => finished || status[i] !== 'pending';
  const errors = words.map((w, i) => ({ w, s: status[i] })).filter((x) => finished && (x.s === 'missed' || x.s === 'wrong'));

  const renderWord = (w: Word, i: number) => (
    <span key={i} className="inline">
      <button
        type="button"
        onClick={() => finished && setSelected(i)}
        className={cn('mx-0.5 rounded px-0.5 transition-opacity duration-300', revealed(i) ? 'opacity-100' : 'opacity-0', finished && STATUS_CLASS[status[i]])}
        aria-label={revealed(i) ? w.text : 'mot masqué'}
        dangerouslySetInnerHTML={{ __html: w.html }}
      />
      {w.endOfVerse && <span className="mx-1 text-primary">﴿{w.verse}﴾</span>}
    </span>
  );

  const groups = useMemo(() => {
    const key = (w: Word) => (mode === 'pages' ? String(w.page) : `${w.surah}:${w.verse}`);
    const out: { key: string; items: { w: Word; i: number }[] }[] = [];
    words.forEach((w, i) => {
      const k = key(w);
      if (!out.length || out[out.length - 1].key !== k) out.push({ key: k, items: [] });
      out[out.length - 1].items.push({ w, i });
    });
    return out;
  }, [words, mode]);

  const pageRefs = useRef(new Map<string, HTMLDivElement>());
  const activeGroup = activeHifzGroup(groups, status);
  useEffect(() => {
    if (!listening || mode !== 'pages' || !activeGroup) return;
    pageRefs.current.get(activeGroup)?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [activeGroup, listening, mode]);

  const select = 'h-10 rounded-md border border-input bg-background px-2 text-sm';

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background/95 px-3 py-2">
        <Button asChild variant="ghost" size="icon"><Link to="/index" aria-label="Retour"><ArrowLeft /></Link></Button>
        <h1 className="text-base font-semibold">Mémorisation · الحفظ والمراجعة</h1>
      </header>

      <section className="mx-auto max-w-3xl space-y-3 p-3">
        <Tabs value={tab} onValueChange={value => { if (listening) return; const next = new URLSearchParams(params); if (value === 'plan') next.set('tab', 'plan'); else next.delete('tab'); setParams(next); }}>
          <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="control" disabled={listening}>Contrôle · اختبار</TabsTrigger><TabsTrigger value="plan" disabled={listening}>Suivi & révision · متابعة</TabsTrigger></TabsList>
        </Tabs>
        {tab === 'plan' ? <HifzPlanDashboard /> : <>
        {entryId && !trackedEntry && plan.ready && <p role="alert" className="text-sm text-destructive">Ce passage n’est pas disponible sur cet appareil ou ce compte.</p>}
        {trackedEntry && <p className="border-l-2 border-primary py-2 pl-3 font-semibold">{trackedEntry.label} <span className="text-sm font-normal text-muted-foreground">· {trackedEntry.ranges.length} sourate(s)</span></p>}
        {!entryId && <>
        <Tabs value={scope} onValueChange={value => { setScope(value as 'surah' | 'pages'); reset(); }}>
          <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="surah" disabled={listening || starting}>Sourate</TabsTrigger><TabsTrigger value="pages" disabled={listening || starting}>Plage de pages</TabsTrigger></TabsList>
        </Tabs>
        {scope === 'pages' ? <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col text-xs">De la page<Input aria-label="De la page" type="number" min={1} max={604} value={pageStart} disabled={listening || starting} onChange={e => { const n = Number(e.target.value); setPageStart(n); if (pageEnd < n) setPageEnd(n); reset(); }} /></label>
          <label className="flex flex-col text-xs">À la page<Input aria-label="À la page" type="number" min={pageStart} max={604} value={pageEnd} disabled={listening || starting} onChange={e => { setPageEnd(Number(e.target.value)); reset(); }} /></label>
          {corpus && !ranges.length && <p role="alert" className="col-span-2 text-sm text-destructive">Choisissez des pages entre 1 et 604, dans l’ordre.</p>}
        </div> : <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className="col-span-2 flex flex-col text-xs">Sourate
            <select className={select} value={surah} disabled={listening} onChange={(e) => {
              const n = Number(e.target.value); setSurah(n); setFrom(1);
              setTo(surahs.find((s) => s.number === n)?.versesCount ?? 1); reset();
            }}>
              {surahs.map((s) => <option key={s.number} value={s.number}>{s.number}. {s.name} — {s.nameArabic}</option>)}
            </select>
          </label>
          <label className="flex flex-col text-xs">Du verset
            <select className={select} value={from} disabled={listening} onChange={(e) => { const v = Number(e.target.value); setFrom(v); if (to < v) setTo(v); reset(); }}>
              {Array.from({ length: versesCount }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
            </select>
          </label>
          <label className="flex flex-col text-xs">Au verset
            <select className={select} value={to} disabled={listening} onChange={(e) => { const v = Number(e.target.value); setTo(v); if (from > v) setFrom(v); reset(); }}>
              {Array.from({ length: versesCount }, (_, i) => <option key={i} value={i + 1} disabled={i + 1 < from}>{i + 1}</option>)}
            </select>
          </label>
        </div>}
        </>}
        <div className="flex gap-2">
          <Button variant={mode === 'pages' ? 'default' : 'outline'} size="sm" onClick={() => setMode('pages')}>Pages</Button>
          <Button variant={mode === 'verses' ? 'default' : 'outline'} size="sm" onClick={() => setMode('verses')}>Versets</Button>
        </div>

        {!speechAvailable && (
          <p className="rounded-md bg-destructive/10 p-3 text-sm">La reconnaissance vocale n'est pas disponible sur cet appareil. Utilisez Chrome sur Android ou ordinateur.</p>
        )}
        {speechError && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm">{speechError}</p>}
        {nativeAndroid && listening && <p role="status" className="text-xs text-muted-foreground">Le contrôle vocal Android utilise le microphone seul ; l’enregistrement simultané n’est pas disponible.</p>}

        {finished && (
          <div className="rounded-lg border border-border bg-card p-4 text-center">
            <p className="text-4xl font-bold text-primary">{score}%</p>
            <p className="text-sm text-muted-foreground">de justesse · {status.filter((s) => s === 'ok' || s === 'approx').length} mots justes, {status.filter((s) => s === 'wrong').length} erronés, {status.filter((s) => s === 'missed').length} oubliés</p>
            <p className="mt-2 text-xs text-muted-foreground">Estimation de reconnaissance vocale, à confirmer : elle ne mesure pas la qualité du Tajweed.</p>
            <Button className="mt-3" onClick={saveResult} disabled={reviewSaved || !plan.ready}>{reviewSaved ? 'Révision enregistrée' : 'Enregistrer la révision'}</Button>
          </div>
        )}

        {finished && audioUrl && (
          <div className="rounded-lg border border-border bg-card p-3 space-y-2">
            <p className="text-sm font-semibold">Réécouter votre récitation · استمع لتلاوتك</p>
            <audio controls src={audioUrl} className="w-full" />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={keepAudio} className="gap-2"><Download className="h-4 w-4" /> Conserver · حفظ</Button>
              <Button size="sm" variant="outline" onClick={() => { clearAudio(); toast.success('Enregistrement effacé'); }} className="gap-2"><Trash2 className="h-4 w-4" /> Effacer · حذف</Button>
            </div>
          </div>
        )}

        {listening && <p role="status" className="text-center font-semibold text-primary">{score}% de justesse · {status.filter(s => s !== 'pending').length}/{words.length} mots</p>}
        {loadError ? <p role="alert" className="text-sm text-destructive">{loadError}</p> : !corpus ? <Loader2 className="mx-auto animate-spin" /> : (
          <div dir="rtl" className="space-y-4">
            {groups.map((g) => (
              <div key={`${mode}-${g.key}`} data-hifz-page={mode === 'pages' ? g.key : undefined} ref={node => { if (node) pageRefs.current.set(g.key, node); else pageRefs.current.delete(g.key); }} className="scroll-mt-16 rounded-lg border-2 border-accent/60 bg-card p-4">
                {mode === 'pages' && <p className="mb-2 text-center text-xs text-muted-foreground">Page {g.key}</p>}
                <p className="quran-text font-mushaf-hafs text-3xl leading-[2.4]">{g.items.map(({ w, i }) => renderWord(w, i))}</p>
              </div>
            ))}
          </div>
        )}

        {selected !== null && (
          <div className="rounded-md border border-border bg-card p-3 text-sm">
            Sourate {words[selected].surah}, verset {words[selected].verse} — mot attendu : <span className="font-mushaf-hafs text-xl" dir="rtl">{words[selected].text}</span>
            {' '}· {status[selected] === 'ok' ? 'juste' : status[selected] === 'approx' ? 'juste' : status[selected] === 'wrong' ? 'mot erroné' : 'oublié ou non reconnu'}
          </div>
        )}

        {errors.length > 0 && (
          <div className="rounded-md border border-border bg-card p-3 text-sm">
            <p className="mb-1 font-semibold">Erreurs ({errors.length})</p>
            <ul className="space-y-1">
              {errors.map(({ w, s }, k) => (
                <li key={k}>Sourate {w.surah}, verset {w.verse} : <span dir="rtl" className="font-mushaf-hafs text-lg">{w.text}</span> — {s === 'missed' ? 'oublié' : 'mot erroné'}</li>
              ))}
            </ul>
          </div>
        )}
        </>}
      </section>

      {tab === 'control' && <div className="fixed inset-x-0 bottom-0 flex flex-wrap justify-center gap-3 border-t border-border bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {listening ? (
          <Button size="lg" variant="destructive" onClick={stop} className="gap-2"><Square /> Terminer</Button>
        ) : (
          <Button size="lg" onClick={start} disabled={!speechAvailable || !words.length || starting} className="gap-2">{starting ? <Loader2 className="animate-spin" /> : <Mic />} Commencer</Button>
        )}
        <Button size="lg" variant="outline" onClick={reset} disabled={listening || starting} className="gap-2"><RotateCcw /> Recommencer</Button>
      </div>}
    </div>
  );
};

export default HifzControl;
