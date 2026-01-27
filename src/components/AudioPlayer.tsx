import { Play, Pause, SkipBack, SkipForward, Volume2, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { ReciterId, RECITERS } from '@/hooks/useQuranAudio';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface AudioPlayerProps {
  isPlaying: boolean;
  isLoading?: boolean;
  currentVerse: number;
  totalVerses: number;
  progress?: number;
  reciter?: ReciterId;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onReciterChange?: (reciter: ReciterId) => void;
  onSeek?: (percentage: number) => void;
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
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onReciterChange,
  onSeek,
  surahName,
  className,
}: AudioPlayerProps) => {
  const verseProgress = ((currentVerse) / totalVerses) * 100;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percentage = ((e.clientX - rect.left) / rect.width) * 100;
    onSeek(Math.max(0, Math.min(100, percentage)));
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

          {/* Volume (placeholder) */}
          <div className="flex-1 flex justify-end">
            <Volume2 className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
};
