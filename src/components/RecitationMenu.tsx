import { useT } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { Play, Pause, X, Loader2, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { useAudioCache } from '@/hooks/useAudioCache';
import { cn } from '@/lib/utils';
import { surahs } from '@/data/surahs';
import { clampLocation, compareLocations, type RecitationSession } from '@/lib/recitationSession';
import {
  RECITERS,
  RECITER_IDS,
  type ReciterId,
  type RepeatMode,
  type RepeatSettings,
  type RepeatPauseSettings,
} from '@/hooks/useQuranAudio';

export interface RecitationStartConfig {
  surah: number;
  verse: number;
  repeat: { mode: RepeatMode; count: number; rangeStart?: number; rangeEnd?: number };
  /** 0 = بدون انتظار (aucune pause) ; sinon multiplicateur de la durée du verset. */
  gapMultiplier: number;
  session: RecitationSession;
}

interface RecitationMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surahNumber: number;
  totalVerses: number;
  isPlaying: boolean;
  isLoading: boolean;
  currentVerse: number;
  reciter: ReciterId;
  playbackSpeed: number;
  repeatSettings: RepeatSettings;
  repeatPause: RepeatPauseSettings;
  highlightEnabled: boolean;
  session: RecitationSession | null;
  onHighlightChange: (enabled: boolean) => void;
  onPause: () => void;
  onReciterChange: (reciter: ReciterId) => void;
  onSpeedChange: (speed: number) => void;
  /** Lance la lecture avec la configuration choisie dans le panneau. */
  onStart: (config: RecitationStartConfig) => void;
  page: number;
  pageStart: number;
  pageEnd: number;
  onGoToPage: (page: number) => void;
  onGoToSurah: (surah: number) => void;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

const COUNT_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: 'مرة واحدة / 1 fois' },
  { value: 2, label: 'مرتين / 2 fois' },
  { value: 3, label: '3 مرات / 3 fois' },
  { value: 5, label: '5 مرات / 5 fois' },
  { value: 10, label: 'عشر مرات / 10 fois' },
  { value: 0, label: '∞ بلا توقف / infini' },
];

const GAP_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'بدون انتظار / Sans pause' },
  { value: 1, label: '1x مدة الآية' },
  { value: 1.5, label: '1.5x مدة الآية' },
  { value: 2, label: '2x مدة الآية' },
];

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="border-b border-border pb-3">
    <h3 className="text-primary text-sm font-semibold py-2">
      {title}
    </h3>
    <div>{children}</div>
  </section>
);

export const RecitationMenu = ({
  open,
  onOpenChange,
  surahNumber,
  totalVerses,
  isPlaying,
  isLoading,
  currentVerse,
  reciter,
  playbackSpeed,
  repeatSettings,
  repeatPause,
  highlightEnabled,
  session,
  onHighlightChange,
  onPause,
  onReciterChange,
  onSpeedChange,
  onStart, page, pageStart, pageEnd, onGoToPage, onGoToSurah,
}: RecitationMenuProps) => {
  const t = useT();
  const { downloadSurahAudio, isDownloading, progress } = useAudioCache();
  const L = (fr: string, ar: string, en: string) => t.lang === 'ar' ? ar : t.lang === 'en' ? en : fr;
  const [scope, setScope] = useState<'page' | 'surah' | 'verse' | 'range'>('range');
  const fullSurah = RECITERS[reciter].fullSurah === true;
  const [startSurah, setStartSurah] = useState(surahNumber);
  const [startVerse, setStartVerse] = useState(String(currentVerse || 1));
  const [stopEnabled, setStopEnabled] = useState(repeatSettings.mode === 'range');
  const [stopSurah, setStopSurah] = useState(surahNumber);
  const [untilQuranEnd, setUntilQuranEnd] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [stopVerse, setStopVerse] = useState(String(repeatSettings.rangeEnd ?? totalVerses));
  const [verseRepeatCount, setVerseRepeatCount] = useState(
    repeatSettings.mode === 'verse' ? repeatSettings.count : 1
  );
  const [rangeRepeatCount, setRangeRepeatCount] = useState(
    repeatSettings.mode === 'range' ? repeatSettings.count : 1
  );
  const [verseGap, setVerseGap] = useState(repeatPause.enabled ? repeatPause.multiplier : 0);
  const [rangeGap, setRangeGap] = useState(repeatPause.enabled ? repeatPause.multiplier : 0);

  // Réinitialise les champs à chaque ouverture avec l'état courant.
  useEffect(() => {
    if (!open) return;
    setStartSurah(surahNumber);
    setStartVerse(String(currentVerse || 1));
    setStopEnabled(session ? !(session.end.surah === 114 && session.end.verse === 6) : repeatSettings.mode === 'range');
    setStopSurah(session?.end.surah ?? surahNumber);
    setUntilQuranEnd(session?.end.surah === 114 && session.end.verse === 6);
    setValidationError('');
    setStopVerse(String(session?.end.verse ?? repeatSettings.rangeEnd ?? totalVerses));
    setVerseRepeatCount(repeatSettings.mode === 'verse' ? repeatSettings.count : 1);
    setRangeRepeatCount(session?.passageCount ?? (repeatSettings.mode === 'range' ? repeatSettings.count : 1));
    setVerseGap(repeatPause.enabled ? repeatPause.multiplier : 0);
    setRangeGap(repeatPause.enabled ? repeatPause.multiplier : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const startSurahInfo = surahs.find((s) => s.number === startSurah);
  const startMax = startSurahInfo?.versesCount ?? totalVerses;

  const handlePlayClick = () => {
    if (isPlaying) {
      onPause();
      return;
    }
    if (fullSurah) {
      onStart({
        surah: startSurah, verse: 1, repeat: { mode: 'none', count: 1 }, gapMultiplier: 0,
        session: { start: { surah: startSurah, verse: 1 }, end: { surah: startSurah, verse: startMax }, passageCount: 1, completedPassages: 0 },
      });
      return;
    }
    const scopeStart = scope === 'page' ? pageStart : scope === 'surah' ? 1 : parseInt(startVerse) || 1;
    const scopeSurah = scope === 'page' ? surahNumber : startSurah;
    const start = clampLocation({ surah: scopeSurah, verse: scopeStart });
    const end = scope === 'page' ? { surah: surahNumber, verse: pageEnd }
      : scope === 'verse' ? start
      : scope === 'surah' ? { surah: startSurah, verse: startMax }
      : untilQuranEnd ? { surah: 114, verse: 6 }
      : stopEnabled ? clampLocation({ surah: stopSurah, verse: parseInt(stopVerse) || 1 })
      : { surah: start.surah, verse: startMax };
    if (compareLocations(end, start) < 0) {
      setValidationError('invalidStop');
      return;
    }
    setValidationError('');
    onStart({
      surah: start.surah,
      verse: start.verse,
      repeat: verseRepeatCount !== 1 ? { mode: 'verse', count: verseRepeatCount } : { mode: 'none', count: 1 },
      gapMultiplier: rangeRepeatCount !== 1 ? rangeGap : verseGap,
      session: { start, end, passageCount: rangeRepeatCount, completedPassages: 0 },
    });
  };

  if (!open) return null;

  return (
    <>
      {/* Voile d'arrière-plan */}
      <div
        className={cn(
          'fixed inset-0 z-[95] bg-foreground/50 transition-opacity duration-300',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Panneau coulissant (côté droit, adapté à l'arabe) */}
      <aside
        dir={t.lang === 'ar' ? 'rtl' : 'ltr'}
        role="dialog"
        aria-modal="true"
        aria-label={t('audioMenu')}
        className={cn(
          'fixed inset-y-0 right-0 z-[100] flex w-full max-w-sm flex-col bg-background shadow-elevated transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* En-tête vert */}
        <header className="flex items-center justify-between bg-primary px-4 py-3">
          <h2 className="flex-1 text-center text-lg font-bold text-primary-foreground">
            {t('audioMenu')}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="text-primary-foreground hover:bg-primary-foreground/20 rounded-full"
            aria-label={t('close')}
          >
            <X className="h-5 w-5" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Bouton lecture principal */}
          <Button
            variant="outline"
            onClick={handlePlayClick}
            disabled={isLoading}
            className="w-full h-12 rounded-full border-2 border-primary text-primary text-lg font-bold gap-2 hover:bg-primary hover:text-primary-foreground"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isPlaying ? (
              <>
                <Pause className="h-5 w-5" /> {t('pause')}
              </>
            ) : (
              <>
                <Play className="h-5 w-5" /> {t('play')}
              </>
            )}
          </Button>

          {/* Surlignage du verset récité */}
          <label className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 cursor-pointer">
            <Checkbox
              disabled={fullSurah}
              checked={highlightEnabled && !fullSurah}
              onCheckedChange={(checked) => onHighlightChange(checked === true)}
              aria-label={t('highlightVerse')}
            />
            <span className="text-sm font-medium text-foreground flex-1">{t('highlightVerse')}</span>
          </label>

          {/* Récitateur et vitesse */}
          <Section title={t('reciterSpeed')}>
            <div className="space-y-2">
              <Select value={reciter} onValueChange={(v) => onReciterChange(v as ReciterId)}>
                <SelectTrigger className="h-auto min-h-10 text-sm [&>span]:whitespace-normal [&>span]:text-left" aria-label={t('reciter')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[110]">
                  {RECITER_IDS.filter((key) => RECITERS[key].qiraat === RECITERS[reciter].qiraat).map((key) => (
                    <SelectItem key={key} value={key} className="text-xs">
                      {t.lang === 'ar' ? RECITERS[key].nameAr : RECITERS[key].name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(playbackSpeed)} onValueChange={(v) => onSpeedChange(Number(v))}>
                <SelectTrigger className="h-10 text-xs" aria-label={t('speed')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[110]">
                  {SPEED_OPTIONS.map((speed) => (
                    <SelectItem key={speed} value={String(speed)} className="text-xs">
                      {speed}x
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Section>

          <Section title={t('chooseReading')}>
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-3" dir="ltr">
                <Button size="icon" variant="outline" disabled={page >= 604} aria-label={t('nextPage')} onClick={() => onGoToPage(Math.min(604, page + 1))}><ChevronLeft /></Button>
                <span className="min-w-16 text-center font-semibold tabular-nums">{t('page')} {page}</span>
                <Button size="icon" variant="outline" disabled={page <= 1} aria-label={t('prevPage')} onClick={() => onGoToPage(Math.max(1, page - 1))}><ChevronRight /></Button>
              </div>
              <select className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm" value={surahNumber} aria-label={t('chooseSurah')} onChange={(e) => onGoToSurah(Number(e.target.value))}>
                {surahs.map((s) => <option key={s.number} value={s.number}>{s.number}. {t.lang === 'ar' ? s.nameArabic : s.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                {(['page', 'surah', 'verse', 'range'] as const).map((key) => <Button key={key} variant={scope === key ? 'default' : 'outline'} onClick={() => setScope(key)} aria-pressed={scope === key}>{key === 'range' ? L('Plage de versets', 'مقطع آيات', 'Verse range') : t(key)}</Button>)}
              </div>
            </div>
          </Section>

          {/* Début de la récitation */}
          {(scope === 'verse' || scope === 'range') && <Section title={t('startFrom')}>
            <div className="grid grid-cols-2 gap-2">
              <Select value={String(startSurah)} onValueChange={(v) => setStartSurah(Number(v))}>
                <SelectTrigger className="h-10 text-xs" aria-label={t('surah')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[110] max-h-64">
                  {surahs.map((s) => (
                    <SelectItem key={s.number} value={String(s.number)} className="text-xs">
                      {s.number} - {t.lang === 'ar' ? s.nameArabic : s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                disabled={fullSurah}
                min={1}
                max={startMax}
                value={fullSurah ? '1' : startVerse}
                onChange={(e) => setStartVerse(e.target.value)}
                className="h-10 text-sm"
                aria-label={t('verse')}
                placeholder={`1-${startMax}`}
              />
            </div>
          </Section>

          }

          {/* Arrêt de la récitation */}
          {!fullSurah && <>
          {scope === 'range' && <Section title={t('stopAt')}>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={stopEnabled}
                  onCheckedChange={(checked) => { setStopEnabled(checked === true); setUntilQuranEnd(false); }}
                  aria-label={t('preciseVerse')}
                />
                <span className="text-sm text-foreground">{t('preciseVerse')}</span>
              </label>
              {stopEnabled && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {t('verse')}
                  </span>
                  <Input
                    type="number"
                    min={1}
                    max={surahs.find((s) => s.number === stopSurah)?.versesCount ?? 1}
                    value={stopVerse}
                    onChange={(e) => setStopVerse(e.target.value)}
                    className="h-10 text-sm"
                    aria-label={t('stopVerse')}
                    placeholder={`1-${surahs.find((s) => s.number === stopSurah)?.versesCount ?? 1}`}
                  />
                </div>
              )}
              {stopEnabled && (
                <Select value={String(stopSurah)} onValueChange={(v) => { setStopSurah(Number(v)); setStopVerse('1'); setValidationError(''); }}>
                  <SelectTrigger className="h-auto min-h-10 text-xs" aria-label={t('stopSurah')}><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[110] max-h-64">
                    {surahs.filter((s) => s.number >= startSurah).map((s) => (
                      <SelectItem key={s.number} value={String(s.number)} className="text-xs">{s.number} - {t.lang === 'ar' ? s.nameArabic : s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <Checkbox checked={untilQuranEnd} onCheckedChange={(checked) => { setUntilQuranEnd(checked === true); setStopEnabled(false); setValidationError(''); }} aria-label={t('quranEnd')} />
                <span className="text-sm text-foreground">{t('quranEnd')}</span>
              </label>
              {validationError && <p role="alert" className="text-sm text-destructive">{t(validationError)}</p>}
            </div>
          </Section>

          }

          {/* Répétition du verset */}
          <Section title={t('verseRepeat')}>
            <div className="grid grid-cols-2 gap-2">
              <Select value={String(verseRepeatCount)} onValueChange={(v) => setVerseRepeatCount(Number(v))}>
                <SelectTrigger className="h-10 text-xs" aria-label={t('repeatCount')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[110]">
                  {COUNT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)} className="text-xs">
                      {o.value === 0 ? t('infinite') : `${o.value} ${t('times')}`} 
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(verseGap)} onValueChange={(v) => setVerseGap(Number(v))}>
                <SelectTrigger className="h-10 text-xs" aria-label={t('repeatGap')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[110]">
                  {GAP_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)} className="text-xs">
                      {o.value === 0 ? t('noGap') : `${o.value}x ${t('verseDuration')}`} 
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Section>

          {/* Répétition du passage */}
          <Section title={t('passageRepeat')}>
            <div className="grid grid-cols-2 gap-2">
              <Select value={String(rangeRepeatCount)} onValueChange={(v) => setRangeRepeatCount(Number(v))}>
                <SelectTrigger className="h-10 text-xs" aria-label={t('repeatCount')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[110]">
                  {COUNT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)} className="text-xs">
                      {o.value === 0 ? t('infinite') : `${o.value} ${t('times')}`} 
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(rangeGap)} onValueChange={(v) => setRangeGap(Number(v))}>
                <SelectTrigger className="h-10 text-xs" aria-label={t('repeatGap')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[110]">
                  {GAP_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)} className="text-xs">
                      {o.value === 0 ? t('noGap') : `${o.value}x ${t('verseDuration')}`} 
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Section>
          </>}
          <Button variant="outline" className="w-full gap-2" disabled={isDownloading} onClick={() => void downloadSurahAudio(reciter, surahNumber).catch(() => {})}>
            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isDownloading ? `${Math.round(progress)}%` : L('Télécharger la sourate', 'تحميل السورة', 'Download surah')}
          </Button>
        </div>
      </aside>
    </>
  );
};
