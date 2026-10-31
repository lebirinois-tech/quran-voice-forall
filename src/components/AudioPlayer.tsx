import { getReciterAudioUrl } from '@/hooks/useQuranAudio';
import { surahs } from '@/data/surahs';
import { useT } from '@/lib/i18n';
import { Play, Pause, SkipBack, SkipForward, Volume2, Loader2, Download, Repeat, Repeat1, Gauge, Mic2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { ReciterId, RECITERS, RECITER_IDS, RepeatMode, RepeatSettings, RepeatPauseSettings, getSafeReciter } from '@/hooks/useQuranAudio';
import { toast } from 'sonner';
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';

interface AudioPlayerProps {
  isPlaying: boolean;
  isLoading?: boolean;
  currentVerse: number;
  totalVerses: number;
  progress?: number;
  reciter?: ReciterId;
  surahNumber?: number;
  repeatSettings?: RepeatSettings;
  currentRepeatCount?: number;
  playbackSpeed?: number;
  repeatPause?: RepeatPauseSettings;
  isPausingForRepeat?: boolean;
  pauseRemainingSec?: number;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onReciterChange?: (reciter: ReciterId) => void;
  onSeek?: (percentage: number) => void;
  onRepeatModeChange?: (mode: RepeatMode, count: number, rangeStart?: number, rangeEnd?: number) => void;
  onSpeedChange?: (speed: number) => void;
  onRepeatPauseChange?: (next: Partial<RepeatPauseSettings>) => void;
  surahName?: string;
  className?: string;
  embedded?: boolean;
  /** Boutons supplémentaires (casque, micro) intégrés à la barre. */
  leadingControls?: React.ReactNode;
  trailingControls?: React.ReactNode;
}

export const AudioPlayer = ({
  isPlaying,
  isLoading = false,
  currentVerse,
  totalVerses,
  progress = 0,
  reciter = 'husary',
  surahNumber = 1,
  repeatSettings = { mode: 'none', count: 1 },
  currentRepeatCount = 0,
  playbackSpeed = 1,
  repeatPause = { enabled: false, multiplier: 1 },
  isPausingForRepeat = false,
  pauseRemainingSec = 0,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onReciterChange,
  onSeek,
  onRepeatModeChange,
  onSpeedChange,
  onRepeatPauseChange,
  surahName,
  className,
  embedded = false,
  leadingControls,
  trailingControls,
}: AudioPlayerProps) => {
  const t = useT();
  const verseProgress = ((currentVerse) / totalVerses) * 100;
  const [isDownloading, setIsDownloading] = useState(false);
  const [rangeStart, setRangeStart] = useState(currentVerse.toString());
  const [rangeEnd, setRangeEnd] = useState(currentVerse.toString());
  const [repeatCount, setRepeatCount] = useState('3');

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percentage = ((e.clientX - rect.left) / rect.width) * 100;
    onSeek(Math.max(0, Math.min(100, percentage)));
  };

  const handleDownloadCurrentVerse = async () => {
    setIsDownloading(true);
    try {
      const audioResponse = await fetch(getReciterAudioUrl(surahNumber, currentVerse, reciter));
      if (!audioResponse.ok) throw new Error('Audio non disponible');
      const url = URL.createObjectURL(await audioResponse.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = `Surah_${surahNumber}_Verset_${currentVerse}_${RECITERS[reciter]?.name ?? reciter}.mp3`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Téléchargement terminé');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Erreur lors du téléchargement');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadSurah = async () => {
    setIsDownloading(true);
    toast.info(`Téléchargement de la sourate ${surahNumber} en cours...`);
    
    try {
      const verseCount = surahs.find((s) => s.number === surahNumber)?.versesCount;
      if (!verseCount) throw new Error('Sourate non disponible');
      let downloadedCount = 0;
      for (let verse = 1; verse <= verseCount; verse++) {
        try {
          const response = await fetch(getReciterAudioUrl(surahNumber, verse, reciter));
          if (!response.ok) throw new Error('Audio non disponible');
          const url = URL.createObjectURL(await response.blob());
          const link = document.createElement('a');
          link.href = url;
          link.download = `Surah_${surahNumber}_Verset_${verse}_${RECITERS[reciter]?.name ?? reciter}.mp3`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
          downloadedCount++;
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Error downloading verse ${verse}:`, error);
        }
      }
      if (downloadedCount !== verseCount) throw new Error('Téléchargement incomplet');
      toast.success(`${downloadedCount} versets téléchargés`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Erreur lors du téléchargement');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={cn(
      embedded
        ? "relative bg-card border border-border shadow-soft rounded-2xl p-3"
        : "fixed bottom-0 left-0 right-0 w-full max-w-full overflow-hidden bg-card border-t border-border shadow-elevated z-40 px-2 py-1.5 animate-slide-in",
      className
    )}>
      <div className={cn(embedded ? "w-full" : "container mx-auto w-full max-w-2xl min-w-0 overflow-hidden")}>
        {/* Audio Progress bar (current verse audio) */}
        <div 
          className="mb-1 cursor-pointer group"
          onClick={handleProgressClick}
        >
          <div className="h-1.5 bg-muted rounded-full overflow-hidden group-hover:h-2 transition-all">
            <div 
              className="h-full bg-primary transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Verse Progress bar */}
        <div className="mb-0.5">
          <div className="h-1 bg-muted/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-gold transition-all duration-300"
              style={{ width: `${verseProgress}%` }}
            />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-[10px] text-muted-foreground">
              {t('verse')} {currentVerse} / {totalVerses}
              {repeatSettings.mode !== 'none' && (
                <span className="ml-2 text-primary">
                  🔁 {repeatSettings.mode === 'verse' ? t('verse') : `${repeatSettings.rangeStart}-${repeatSettings.rangeEnd}`}
                  {repeatSettings.count > 0 ? ` (${currentRepeatCount + 1}/${repeatSettings.count})` : ' (∞)'}
                </span>
              )}
            </span>
            {isLoading && (
              <span className="text-xs text-primary flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t('loading')}
              </span>
            )}
            {isPausingForRepeat && !isLoading && (
              <span className="text-xs text-primary flex items-center gap-1 font-medium animate-pulse">
                <Mic2 className="h-3 w-3" />
                Répétez à voix haute… {pauseRemainingSec}s
              </span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-0.5 sm:gap-3">
          {leadingControls && <div className="flex items-center shrink-0">{leadingControls}</div>}
          {/* Reciter Selector */}
          <div className="block shrink-0 w-[54px] sm:w-auto sm:flex-1 sm:min-w-0">
            {onReciterChange ? (
              <Select 
                value={reciter} 
                onValueChange={(value) => onReciterChange(value as ReciterId)}
              >
                <SelectTrigger className="w-full max-w-[180px] h-7 text-[11px] px-1">
                  <SelectValue placeholder={t('reciter')} />
                </SelectTrigger>
                <SelectContent>
                  {RECITER_IDS.map((key) => (
                    <SelectItem key={key} value={key} className="text-xs">
                      {t.lang === 'ar' ? RECITERS[key].nameAr : RECITERS[key].name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              surahName && (
                <p className="text-sm font-medium text-foreground truncate">
                  {surahName}
                </p>
              )
            )}
          </div>

          {/* Playback Controls */}
          <div className="flex items-center gap-0 sm:gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPrevious}
              disabled={currentVerse <= 1 || isLoading}
              className="rounded-full h-8 w-8"
              aria-label={t('prevVerse')}
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              variant="islamic"
              size="icon-lg"
              onClick={isPlaying ? onPause : onPlay}
              disabled={isLoading}
              className="rounded-full h-10 w-10 sm:h-14 sm:w-14"
              aria-label={isPlaying ? t('pause') : t('play')}
            >
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 ml-0.5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onNext}
              disabled={currentVerse >= totalVerses || isLoading}
              className="rounded-full h-8 w-8"
              aria-label={t('nextVerse')}
            >
              <SkipForward className="h-4 w-4" />
            </Button>

          </div>


          {/* Repeat & Download Buttons */}
          <div className="flex-1 flex flex-nowrap items-center justify-end gap-0.5 sm:gap-1">
            {trailingControls}


            {/* Pause-to-repeat (after reciter) */}
            {onRepeatPauseChange && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={repeatPause.enabled ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                          "rounded-full h-8 gap-1 px-2",
                          repeatPause.enabled && "bg-primary text-primary-foreground"
                        )}
                        aria-label={t('repeatPause')}
                      >
                        <Mic2 className="h-4 w-4" />
                        <span className="hidden sm:inline text-[11px] font-medium">{t('repeat')}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 z-[130] pointer-events-auto" align="end">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <h4 className="font-medium text-sm">{t('repeatPause')}</h4>
                            <p className="text-[11px] text-muted-foreground">
                              {t('pauseHint')}
                            </p>
                          </div>
                          <Switch
                            checked={repeatPause.enabled}
                            onCheckedChange={(checked) => onRepeatPauseChange({ enabled: checked })}
                            aria-label={t('enablePause')}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">{t('pauseDuration')}</Label>
                          <div className="grid grid-cols-4 gap-1">
                            {[
                              { v: 1, label: '1x' },
                              { v: 1.25, label: '1.25x' },
                              { v: 1.5, label: '1.5x' },
                              { v: 2, label: '2x' },
                            ].map(({ v, label }) => (
                              <Button
                                key={v}
                                variant={Math.abs(repeatPause.multiplier - v) < 0.01 ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => onRepeatPauseChange({ multiplier: v })}
                                className="text-xs px-2"
                              >
                                {label}
                              </Button>
                            ))}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {t('gapHint')}
                          </p>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
            )}

            {/* Repeat Button with Popover */}
            {onRepeatModeChange && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "rounded-full",
                      repeatSettings.mode !== 'none' && "text-primary bg-primary/10"
                    )}
                    aria-label={t('repeatOptions')}
                  >
                    {repeatSettings.mode === 'verse' ? (
                      <Repeat1 className="h-5 w-5" />
                    ) : (
                      <Repeat className="h-5 w-5" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 z-[130] pointer-events-auto" align="end">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">{t('repeatMode')}</h4>
                    
                    {/* Quick options */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={repeatSettings.mode === 'none' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onRepeatModeChange('none', 1)}
                        className="text-xs"
                      >
                        {t('disabled')}
                      </Button>
                      <Button
                        variant={repeatSettings.mode === 'verse' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onRepeatModeChange('verse', parseInt(repeatCount) || 3)}
                        className="text-xs"
                      >
                        {t('currentVerse')}
                      </Button>
                    </div>

                    {/* Repeat count */}
                    <div className="space-y-2">
                      <Label className="text-xs">{t('repeatCount')}</Label>
                      <div className="flex gap-2">
                        {['3', '5', '10', '0'].map((num) => (
                          <Button
                            key={num}
                            variant={repeatCount === num ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              setRepeatCount(num);
                              if (repeatSettings.mode !== 'none') {
                                onRepeatModeChange(
                                  repeatSettings.mode, 
                                  parseInt(num),
                                  repeatSettings.rangeStart,
                                  repeatSettings.rangeEnd
                                );
                              }
                            }}
                            className="flex-1 text-xs"
                          >
                            {num === '0' ? '∞' : num}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Range selection */}
                    <div className="space-y-2 pt-2 border-t border-border">
                      <Label className="text-xs">{t('repeatRange')}</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          max={totalVerses}
                          value={rangeStart}
                          onChange={(e) => setRangeStart(e.target.value)}
                          className="h-8 text-xs"
                          placeholder={t('start')}
                        />
                        <span className="text-muted-foreground">{t('to')}</span>
                        <Input
                          type="number"
                          min="1"
                          max={totalVerses}
                          value={rangeEnd}
                          onChange={(e) => setRangeEnd(e.target.value)}
                          className="h-8 text-xs"
                          placeholder={t('end')}
                        />
                      </div>
                      <Button
                        variant={repeatSettings.mode === 'range' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          const start = parseInt(rangeStart);
                          const end = parseInt(rangeEnd);
                          if (start >= 1 && end <= totalVerses && start <= end) {
                            onRepeatModeChange('range', parseInt(repeatCount) || 3, start, end);
                          } else {
                            toast.error('Plage de versets invalide');
                          }
                        }}
                        className="w-full text-xs"
                      >
                        {t('repeatThisRange')}
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Download Options */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isDownloading || isLoading}
                  className="rounded-full hidden sm:inline-flex"
                  aria-label={t('downloadOptions')}
                >
                  {isDownloading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Download className="h-5 w-5" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 z-[130] pointer-events-auto" align="end">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm mb-3">{t('downloadAudio')}</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadCurrentVerse}
                    disabled={isDownloading}
                    className="w-full justify-start text-xs"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t('currentVerse')} ({currentVerse})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadSurah}
                    disabled={isDownloading}
                    className="w-full justify-start text-xs"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t('entireSurah')} ({totalVerses} {t('versesUnit')})
                  </Button>
                   <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      {t('reciter')}: {t.lang === 'ar' ? RECITERS[getSafeReciter(reciter)].nameAr : RECITERS[getSafeReciter(reciter)].name}
                    </p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Volume2 className="hidden sm:block h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
};
