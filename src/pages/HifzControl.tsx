import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mic, Square, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { surahs } from '@/data/surahs';
import { hafsDisplayText } from '@/lib/hafsDisplay';
import { applyAutoTajweed } from '@/lib/autoTajweed';
import { sanitizeTajweedHtml } from '@/lib/sanitize';
import { alignRecitation, recitationScore, type WordStatus } from '@/lib/hifzMatcher';
import { cn } from '@/lib/utils';

interface VerseEntry { numberInSurah: number; text: string; page: number }
type Corpus = Record<string, { arabic: VerseEntry[] }>;
let corpusCache: Promise<Corpus> | null = null;
const loadCorpus = () => (corpusCache ??= fetch('/data/quran-hafs-fr.json').then((r) => {
  if (!r.ok) { corpusCache = null; throw new Error('fetch failed'); }
  return r.json();
}));

interface Word { verse: number; page: number; text: string; html: string; endOfVerse: boolean }

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
  const [corpus, setCorpus] = useState<Corpus | null>(null);
  const initialSurah = (() => {
    const n = Number(new URLSearchParams(window.location.search).get('surah'));
    return Number.isInteger(n) && n >= 1 && n <= 114 ? n : 1;
  })();
  const [surah, setSurah] = useState(initialSurah);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(() => Math.min(7, surahs.find((s) => s.number === initialSurah)?.versesCount ?? 7));
  const [mode, setMode] = useState<'verses' | 'pages'>('pages');
  const [listening, setListening] = useState(false);
  const [finished, setFinished] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const recRef = useRef<any>(null);
  const finalRef = useRef('');
  const wantRef = useRef(false);

  useEffect(() => { loadCorpus().then(setCorpus).catch(() => setCorpus({})); }, []);

  const versesCount = surahs.find((s) => s.number === surah)?.versesCount ?? 1;
  const words = useMemo<Word[]>(() => {
    const verses = corpus?.[String(surah)]?.arabic ?? [];
    return verses
      .filter((v) => v.numberInSurah >= from && v.numberInSurah <= to)
      .flatMap((v) => {
        const parts = hafsDisplayText(v.text).split(/\s+/).filter(Boolean);
        return parts.map((p, i) => ({
          verse: v.numberInSurah, page: v.page, text: p,
          html: sanitizeTajweedHtml(applyAutoTajweed(p)), endOfVerse: i === parts.length - 1,
        }));
      });
  }, [corpus, surah, from, to]);

  const status = useMemo(
    () => alignRecitation(words.map((w) => w.text), transcript, finished),
    [words, transcript, finished],
  );
  const score = recitationScore(status);

  const reset = () => { finalRef.current = ''; setTranscript(''); setFinished(false); setSelected(null); };

  const stop = useCallback(() => {
    wantRef.current = false;
    recRef.current?.stop();
    setListening(false);
    setFinished(true);
  }, []);

  const start = () => {
    if (!SpeechRecognitionCtor) return;
    reset();
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
    rec.onerror = (e: any) => { if (e.error === 'not-allowed') { wantRef.current = false; setListening(false); } };
    recRef.current = rec;
    wantRef.current = true;
    rec.start();
    setListening(true);
  };

  useEffect(() => () => { wantRef.current = false; recRef.current?.abort?.(); }, []);
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
    const key = (w: Word) => (mode === 'pages' ? w.page : w.verse);
    const out: { key: number; items: { w: Word; i: number }[] }[] = [];
    words.forEach((w, i) => {
      const k = key(w);
      if (!out.length || out[out.length - 1].key !== k) out.push({ key: k, items: [] });
      out[out.length - 1].items.push({ w, i });
    });
    return out;
  }, [words, mode]);

  const select = 'h-10 rounded-md border border-input bg-background px-2 text-sm';

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background/95 px-3 py-2">
        <Button asChild variant="ghost" size="icon"><Link to="/index" aria-label="Retour"><ArrowLeft /></Link></Button>
        <h1 className="text-base font-semibold">Contrôle de mémorisation · مراجعة الحفظ</h1>
      </header>

      <section className="mx-auto max-w-3xl space-y-3 p-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
        </div>
        <div className="flex gap-2">
          <Button variant={mode === 'pages' ? 'default' : 'outline'} size="sm" onClick={() => setMode('pages')}>Pages</Button>
          <Button variant={mode === 'verses' ? 'default' : 'outline'} size="sm" onClick={() => setMode('verses')}>Versets</Button>
        </div>

        {!SpeechRecognitionCtor && (
          <p className="rounded-md bg-destructive/10 p-3 text-sm">La reconnaissance vocale n'est pas disponible sur cet appareil. Utilisez Chrome sur Android ou ordinateur.</p>
        )}

        {finished && (
          <div className="rounded-lg border border-border bg-card p-4 text-center">
            <p className="text-4xl font-bold text-primary">{score}%</p>
            <p className="text-sm text-muted-foreground">de justesse · {status.filter((s) => s === 'ok' || s === 'approx').length} mots justes, {status.filter((s) => s === 'wrong').length} erronés, {status.filter((s) => s === 'missed').length} oubliés</p>
          </div>
        )}

        {!corpus ? <Loader2 className="mx-auto animate-spin" /> : (
          <div dir="rtl" className="space-y-4">
            {groups.map((g) => (
              <div key={`${mode}-${g.key}`} className="rounded-lg border-2 border-accent/60 bg-card p-4">
                {mode === 'pages' && <p className="mb-2 text-center text-xs text-muted-foreground">Page {g.key}</p>}
                <p className="quran-text font-mushaf-hafs text-3xl leading-[2.4]">{g.items.map(({ w, i }) => renderWord(w, i))}</p>
              </div>
            ))}
          </div>
        )}

        {selected !== null && (
          <div className="rounded-md border border-border bg-card p-3 text-sm">
            Verset {words[selected].verse} — mot attendu : <span className="font-mushaf-hafs text-xl" dir="rtl">{words[selected].text}</span>
            {' '}· {status[selected] === 'ok' ? 'juste' : status[selected] === 'approx' ? 'juste' : status[selected] === 'wrong' ? 'mot erroné' : 'oublié ou non reconnu'}
          </div>
        )}

        {errors.length > 0 && (
          <div className="rounded-md border border-border bg-card p-3 text-sm">
            <p className="mb-1 font-semibold">Erreurs ({errors.length})</p>
            <ul className="space-y-1">
              {errors.map(({ w, s }, k) => (
                <li key={k}>Verset {w.verse} : <span dir="rtl" className="font-mushaf-hafs text-lg">{w.text}</span> — {s === 'missed' ? 'oublié' : 'mot erroné'}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 flex justify-center gap-3 border-t border-border bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {listening ? (
          <Button size="lg" variant="destructive" onClick={stop} className="gap-2"><Square /> Terminer</Button>
        ) : (
          <Button size="lg" onClick={start} disabled={!SpeechRecognitionCtor || !words.length} className="gap-2"><Mic /> Commencer</Button>
        )}
        <Button size="lg" variant="outline" onClick={reset} disabled={listening} className="gap-2"><RotateCcw /> Recommencer</Button>
      </div>
    </div>
  );
};

export default HifzControl;
