import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  isPlaying: boolean;
  currentVerse: number;
  totalVerses: number;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  surahName?: string;
  className?: string;
}

export const AudioPlayer = ({
  isPlaying,
  currentVerse,
  totalVerses,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  surahName,
  className,
}: AudioPlayerProps) => {
  const progress = ((currentVerse) / totalVerses) * 100;

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-elevated z-40",
      "p-4 animate-slide-in",
      className
    )}>
      <div className="container mx-auto max-w-2xl">
        {/* Progress bar */}
        <div className="mb-3">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-gold transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">
              Verset {currentVerse}
            </span>
            <span className="text-xs text-muted-foreground">
              {totalVerses} versets
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {surahName && (
              <p className="text-sm font-medium text-foreground truncate">
                {surahName}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPrevious}
              disabled={currentVerse <= 1}
              className="rounded-full"
              aria-label="Verset précédent"
            >
              <SkipBack className="h-5 w-5" />
            </Button>

            <Button
              variant="islamic"
              size="icon-lg"
              onClick={isPlaying ? onPause : onPlay}
              className="rounded-full"
              aria-label={isPlaying ? "Pause" : "Lecture"}
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 ml-0.5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onNext}
              disabled={currentVerse >= totalVerses}
              className="rounded-full"
              aria-label="Verset suivant"
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 flex justify-end">
            <Volume2 className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
};
