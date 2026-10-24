import { useEffect, useState } from 'react';
import { Play, Pause, X, Loader2 } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { surahs } from '@/data/surahs';
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
  onHighlightChange: (enabled: boolean) => void;
  onPause: () => void;
  onReciterChange: (reciter: ReciterId) => void;
  onSpeedChange: (speed: number) => void;
  /** Lance la lecture avec la configuration choisie dans le panneau. */
  onStart: (config: RecitationStartConfig) => void;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

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
  <section className="rounded-xl border border-border overflow-hidden shadow-soft">
    <h3 className="bg-primary text-primary-foreground text-center text-sm font-semibold py-2 px-3">
      {title}
    </h3>
    <div className="bg-card p-3">{children}</div>
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
  onHighlightChange,
  onPause,
  onReciterChange,
  onSpeedChange,
  onStart,
}: RecitationMenuProps) => {
  const [startSurah, setStartSurah] = useState(surahNumber);
  const [startVerse, setStartVerse] = useState(String(currentVerse || 1));
  const [stopEnabled, setStopEnabled] = useState(repeatSettings.mode === 'range');
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
    setStopEnabled(repeatSettings.mode === 'range');
    setStopVerse(String(repeatSettings.rangeEnd ?? totalVerses));
    setVerseRepeatCount(repeatSettings.mode === 'verse' ? repeatSettings.count : 1);
    setRangeRepeatCount(repeatSettings.mode === 'range' ? repeatSettings.count : 1);
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
    const startV = Math.min(Math.max(1, parseInt(startVerse) || 1), startMax);
    const stopV = Math.min(Math.max(1, parseInt(stopVerse) || totalVerses), totalVerses);
    const sameSurah = startSurah === surahNumber;
    const useRange = stopEnabled && sameSurah && stopV > startV;

    const repeat: RecitationStartConfig['repeat'] = useRange
      ? { mode: 'range', count: rangeRepeatCount, rangeStart: startV, rangeEnd: stopV }
      : !stopEnabled && verseRepeatCount !== 1
        ? { mode: 'verse', count: verseRepeatCount }
        : { mode: 'none', count: 1 };

    onStart({
      surah: startSurah,
      verse: startV,
      repeat,
      gapMultiplier: useRange ? rangeGap : verseGap,
    });
  };

  return (
    <>
      {/* Voile d'arrière-plan */}
      <div
        className={cn(
          'fixed inset-0 z-[95] bg-black/50 transition-opacity duration-300',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Panneau coulissant (côté droit, adapté à l'arabe) */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="التلاوة الصوتية — Récitation audio"
        className={cn(
          'fixed inset-y-0 right-0 z-[100] flex w-full max-w-sm flex-col bg-background shadow-elevated transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* En-tête vert */}
        <header className="flex items-center justify-between bg-primary px-4 py-3">
          <h2 className="flex-1 text-center text-lg font-bold text-primary-foreground">
            التلاوة الصوتية
            <span className="block text-xs font-normal opacity-80">Récitation audio</span>
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="text-primary-foreground hover:bg-primary-foreground/20 rounded-full"
            aria-label="Fermer / إغلاق"
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
                <Pause className="h-5 w-5" /> إيقاف مؤقت / Pause
              </>
            ) : (
              <>
                <Play className="h-5 w-5" /> تشغيل / Lire
              </>
            )}
          </Button>

          {/* Surlignage du verset récité */}
          <label className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 cursor-pointer">
            <Checkbox
              checked={highlightEnabled}
              onCheckedChange={(checked) => onHighlightChange(checked === true)}
              aria-label="تظليل الآية المتلوة في المصحف"
            />
            <span className="text-sm font-medium text-foreground flex-1 text-right" dir="rtl">
              تظليل الآية المتلوّة في المصحف
              <span className="block text-xs text-muted-foreground" dir="ltr">
                Surligner le verset récité
              </span>
            </span>
          </label>

          {/* Récitateur et vitesse */}
          <Section title="القارئ وسرعة التلاوة — Récitateur et vitesse">
            <div className="grid grid-cols-2 gap-2">
              <Select value={reciter} onValueChange={(v) => onReciterChange(v as ReciterId)}>
                <SelectTrigger className="h-10 text-xs" aria-label="القارئ / Récitateur">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[110]">
                  {RECITER_IDS.map((key) => (
                    <SelectItem key={key} value={key} className="text-xs">
                      {RECITERS[key].nameAr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(playbackSpeed)} onValueChange={(v) => onSpeedChange(Number(v))}>
                <SelectTrigger className="h-10 text-xs" aria-label="سرعة التلاوة / Vitesse">
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

          {/* Début de la récitation */}
          <Section title="بدء التلاوة من — Commencer depuis">
            <div className="grid grid-cols-2 gap-2">
              <Select value={String(startSurah)} onValueChange={(v) => setStartSurah(Number(v))}>
                <SelectTrigger className="h-10 text-xs" aria-label="السورة / Sourate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[110] max-h-64">
                  {surahs.map((s) => (
                    <SelectItem key={s.number} value={String(s.number)} className="text-xs">
                      {s.number} - {s.nameArabic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={1}
                max={startMax}
                value={startVerse}
                onChange={(e) => setStartVerse(e.target.value)}
                className="h-10 text-sm"
                aria-label="رقم الآية / Numéro du verset"
                placeholder={`1-${startMax}`}
              />
            </div>
          </Section>

          {/* Arrêt de la récitation */}
          <Section title="إيقاف التلاوة عند — Arrêter la récitation à">
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={stopEnabled}
                  onCheckedChange={(checked) => setStopEnabled(checked === true)}
                  aria-label="آية أخرى / Un autre verset"
                />
                <span className="text-sm text-foreground">آية أخرى / Un verset précis</span>
              </label>
              {stopEnabled && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    الآية / Verset
                  </span>
                  <Input
                    type="number"
                    min={1}
                    max={totalVerses}
                    value={stopVerse}
                    onChange={(e) => setStopVerse(e.target.value)}
                    className="h-10 text-sm"
                    aria-label="آية الإيقاف / Verset d'arrêt"
                    placeholder={`1-${totalVerses}`}
                  />
                </div>
              )}
            </div>
          </Section>

          {/* Répétition du verset */}
          <Section title="تكرار الآية والفاصل بين المرات — Répétition du verset">
            <div className="grid grid-cols-2 gap-2">
              <Select value={String(verseRepeatCount)} onValueChange={(v) => setVerseRepeatCount(Number(v))}>
                <SelectTrigger className="h-10 text-xs" aria-label="عدد مرات تكرار الآية">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[110]">
                  {COUNT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(verseGap)} onValueChange={(v) => setVerseGap(Number(v))}>
                <SelectTrigger className="h-10 text-xs" aria-label="الفاصل بين المرات">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[110]">
                  {GAP_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Section>

          {/* Répétition du passage */}
          <Section title="تكرار المقطع والفاصل بين المرات — Répétition du passage">
            <div className="grid grid-cols-2 gap-2">
              <Select value={String(rangeRepeatCount)} onValueChange={(v) => setRangeRepeatCount(Number(v))}>
                <SelectTrigger className="h-10 text-xs" aria-label="عدد مرات تكرار المقطع">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[110]">
                  {COUNT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(rangeGap)} onValueChange={(v) => setRangeGap(Number(v))}>
                <SelectTrigger className="h-10 text-xs" aria-label="الفاصل بين مرات المقطع">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[110]">
                  {GAP_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Section>
        </div>
      </aside>
    </>
  );
};
