import { Play, Pause, SkipBack, SkipForward, Volume2, Loader2, Download, Repeat, Repeat1, Gauge } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { ReciterId, RECITERS, RepeatMode, RepeatSettings } from '@/hooks/useQuranAudio';
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
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onReciterChange?: (reciter: ReciterId) => void;
  onSeek?: (percentage: number) => void;
  onRepeatModeChange?: (mode: RepeatMode, count: number, rangeStart?: number, rangeEnd?: number) => void;
  onSpeedChange?: (speed: number) => void;
  surahName?: string;
  className?: string;
}

export const AudioPlayer = ({
  isPlaying,
  isLoading = false,
  currentVerse,
  totalVerses,
  progress = 0,
  reciter = 'alafasy',
  surahNumber = 1,
  repeatSettings = { mode: 'none', count: 1 },
  currentRepeatCount = 0,
  playbackSpeed = 1,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onReciterChange,
  onSeek,
  onRepeatModeChange,
  onSpeedChange,
  surahName,
  className,
}: AudioPlayerProps) => {
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
      const edition = RECITERS[reciter].id;
      const response = await fetch(`https://api.alquran.cloud/v1/ayah/${surahNumber}:${currentVerse}/${edition}`);
      const data = await response.json();
      
      if (data.code === 200 && data.data?.audio) {
        const audioResponse = await fetch(data.data.audio);
        const blob = await audioResponse.blob();
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `Surah_${surahNumber}_Verset_${currentVerse}_${RECITERS[reciter].name}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success('Téléchargement terminé');
      } else {
        throw new Error('Audio non disponible');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Erreur lors du téléchargement');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-elevated z-40",
      "p-4 animate-slide-in",
      className
    )}>
      <div className="container mx-auto max-w-2xl">
        {/* Audio Progress bar (current verse audio) */}
        <div 
          className="mb-2 cursor-pointer group"
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
        <div className="mb-3">
          <div className="h-1 bg-muted/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-gold transition-all duration-300"
              style={{ width: `${verseProgress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">
              Verset {currentVerse} / {totalVerses}
              {repeatSettings.mode !== 'none' && (
                <span className="ml-2 text-primary">
                  🔁 {repeatSettings.mode === 'verse' ? 'Verset' : `${repeatSettings.rangeStart}-${repeatSettings.rangeEnd}`}
                  {repeatSettings.count > 0 ? ` (${currentRepeatCount + 1}/${repeatSettings.count})` : ' (∞)'}
                </span>
              )}
            </span>
            {isLoading && (
              <span className="text-xs text-primary flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Chargement...
              </span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-4">
          {/* Reciter Selector */}
          <div className="flex-1 min-w-0">
            {onReciterChange ? (
              <Select 
                value={reciter} 
                onValueChange={(value) => onReciterChange(value as ReciterId)}
              >
                <SelectTrigger className="w-full max-w-[180px] h-8 text-xs">
                  <SelectValue placeholder="Récitateur" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RECITERS).map(([key, { name }]) => (
                    <SelectItem key={key} value={key} className="text-xs">
                      {name}
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
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPrevious}
              disabled={currentVerse <= 1 || isLoading}
              className="rounded-full"
              aria-label="Verset précédent"
            >
              <SkipBack className="h-5 w-5" />
            </Button>

            <Button
              variant="islamic"
              size="icon-lg"
              onClick={isPlaying ? onPause : onPlay}
              disabled={isLoading}
              className="rounded-full"
              aria-label={isPlaying ? "Pause" : "Lecture"}
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
              className="rounded-full"
              aria-label="Verset suivant"
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>

          {/* Speed, Repeat & Download Buttons */}
          <div className="flex-1 flex justify-end gap-1">
            {/* Speed Control */}
            {onSpeedChange && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "rounded-full",
                      playbackSpeed !== 1 && "text-primary bg-primary/10"
                    )}
                    aria-label="Vitesse de lecture"
                  >
                    <span className="text-xs font-bold">{playbackSpeed}x</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48" align="end">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Vitesse de lecture</h4>
                    <div className="grid grid-cols-4 gap-1">
                      {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
                        <Button
                          key={speed}
                          variant={playbackSpeed === speed ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => onSpeedChange(speed)}
                          className="text-xs px-2"
                        >
                          {speed}x
                        </Button>
                      ))}
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
                    aria-label="Options de répétition"
                  >
                    {repeatSettings.mode === 'verse' ? (
                      <Repeat1 className="h-5 w-5" />
                    ) : (
                      <Repeat className="h-5 w-5" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="end">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Mode de répétition</h4>
                    
                    {/* Quick options */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={repeatSettings.mode === 'none' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onRepeatModeChange('none', 1)}
                        className="text-xs"
                      >
                        Désactivé
                      </Button>
                      <Button
                        variant={repeatSettings.mode === 'verse' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onRepeatModeChange('verse', parseInt(repeatCount) || 3)}
                        className="text-xs"
                      >
                        Verset actuel
                      </Button>
                    </div>

                    {/* Repeat count */}
                    <div className="space-y-2">
                      <Label className="text-xs">Nombre de répétitions</Label>
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
                      <Label className="text-xs">Répéter une plage de versets</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          max={totalVerses}
                          value={rangeStart}
                          onChange={(e) => setRangeStart(e.target.value)}
                          className="h-8 text-xs"
                          placeholder="Début"
                        />
                        <span className="text-muted-foreground">à</span>
                        <Input
                          type="number"
                          min="1"
                          max={totalVerses}
                          value={rangeEnd}
                          onChange={(e) => setRangeEnd(e.target.value)}
                          className="h-8 text-xs"
                          placeholder="Fin"
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
                        Répéter cette plage
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownloadCurrentVerse}
              disabled={isDownloading || isLoading}
              className="rounded-full"
              aria-label="Télécharger le verset actuel"
            >
              {isDownloading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Download className="h-5 w-5" />
              )}
            </Button>
            <Volume2 className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
};
