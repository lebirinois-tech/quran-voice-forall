import { useEffect, useState } from 'react';
import { Loader2, Volume2, VolumeX } from 'lucide-react';
import { Button } from './ui/button';
import { getOfflineTafsir } from '@/lib/offlineTafsir';
import { getOfflineVerseTranslation } from '@/lib/offlineVerseTranslations';
import type { ThematicParagraph } from '@/lib/thematicParagraph';
import { surahs } from '@/data/surahs';
import { cn } from '@/lib/utils';
import { getThemeById } from '@/data/quranThemes';

type Lang = 'ar' | 'fr' | 'en';
interface Entry { number: number; arabic: string; translation: string | null; tafsir: string | null }
interface QuranDataset { [surah: string]: { arabic: { numberInSurah: number; text: string }[] } }
let quranPromise: Promise<QuranDataset> | null = null;
function loadQuran() {
  quranPromise ??= fetch('/data/quran-hafs-fr.json', { cache: 'force-cache' }).then(response => {
    if (!response.ok) throw new Error('Quran unavailable');
    return response.json() as Promise<QuranDataset>;
  }).catch(error => { quranPromise = null; throw error; });
  return quranPromise;
}

export function ParagraphTafsir({ paragraph, lang }: { paragraph: ThematicParagraph; lang: Lang }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const { surah, start, end } = paragraph;
  const unavailable = lang === 'fr' ? 'Contenu indisponible' : lang === 'en' ? 'Content unavailable' : 'المحتوى غير متوفر';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setEntries([]);
    void (async () => {
      try {
        const data = await loadQuran();
        const verses = data[String(surah)]?.arabic;
        if (!verses) throw new Error('Surah unavailable');
        const result = await Promise.all(Array.from({ length: end - start + 1 }, async (_, offset) => {
          const number = start + offset;
          const [tafsir, translation] = await Promise.all([
            getOfflineTafsir(surah, number, lang),
            lang === 'ar' ? Promise.resolve(null) : getOfflineVerseTranslation(surah, number, lang),
          ]);
          return { number, arabic: verses.find(verse => verse.numberInSurah === number)?.text ?? '', translation, tafsir };
        }));
        if (!cancelled) setEntries(result);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [surah, start, end, lang]);

  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, [surah, start, end, lang]);
  useEffect(() => { setSpeaking(false); }, [surah, start, end, lang]);

  function toggleSpeak() {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    if (speaking) { setSpeaking(false); return; }
    const text = entries.map(entry => entry.tafsir ?? '').filter(Boolean).join(' ');
    const chunks = text.match(/[^.!؟。]+[.!؟。]?/g) ?? [text];
    let position = 0;
    const next = () => {
      const chunk = chunks[position++];
      if (!chunk) { setSpeaking(false); return; }
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = lang === 'fr' ? 'fr-FR' : lang === 'en' ? 'en-US' : 'ar-SA';
      utterance.rate = 0.9;
      utterance.onend = next;
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    };
    setSpeaking(true);
    next();
  }

  return (
    <section aria-label="Tafsir du paragraphe" className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-primary">
          {surahs.find(item => item.number === surah)?.name} · {surah}:{start}{end !== start ? `–${end}` : ''}
        </h3>
        <Button variant="outline" size="sm" onClick={toggleSpeak} disabled={loading || !entries.some(entry => entry.tafsir)} className="gap-2">
          {speaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          {lang === 'fr' ? (speaking ? 'Arrêter' : 'Écouter le Tafsir') : lang === 'en' ? (speaking ? 'Stop' : 'Listen to tafsir') : (speaking ? 'إيقاف' : 'استماع للتفسير')}
        </Button>
      </div>
      {(() => {
        const official = getThemeById(paragraph.themeId);
        return official && paragraph.themeId.startsWith('m') ? (
          <div dir="rtl" className="rounded-md border-r-4 p-3 text-right font-arabic text-lg leading-9 text-foreground" style={{ backgroundColor: `hsl(${official.bgHsl})`, borderColor: `hsl(${official.hsl})` }}>
            <span className="block text-xs font-semibold text-muted-foreground">التفسير الموضوعي</span>
            {official.labels.ar}
          </div>
        ) : null;
      })()}
      {loading ? <Loader2 aria-label="Chargement du paragraphe" className="h-5 w-5 animate-spin text-primary" /> : failed ? <p role="alert">{unavailable}</p> : (
        <div className="divide-y divide-border">
          {entries.map(entry => (
            <article key={entry.number} data-paragraph-verse={`${surah}:${entry.number}`} className="space-y-3 py-4 first:pt-0">
              <p dir="rtl" className="quran-text text-right text-2xl leading-loose text-foreground">{entry.arabic} ﴿{entry.number.toLocaleString('ar')}﴾</p>
              {lang !== 'ar' && <p className="text-sm leading-7 text-muted-foreground">{entry.translation ?? unavailable}</p>}
              <p dir={lang === 'ar' ? 'rtl' : 'ltr'} className={cn('text-sm leading-7 text-foreground', lang === 'ar' && 'font-arabic text-right text-lg leading-9')}>
                <span className="font-semibold text-primary">{surah}:{entry.number} · </span>{entry.tafsir ?? unavailable}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}