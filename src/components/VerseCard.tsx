import { Verse } from '@/data/surahs';
import { cn } from '@/lib/utils';
import { Play, Pause } from 'lucide-react';
import { Button } from './ui/button';

interface VerseCardProps {
  verse: Verse;
  surahNumber: number;
  isPlaying?: boolean;
  isHighlighted?: boolean;
  onPlay?: () => void;
}

export const VerseCard = ({ 
  verse, 
  surahNumber, 
  isPlaying, 
  isHighlighted,
  onPlay 
}: VerseCardProps) => {
  return (
    <div
      className={cn(
        "p-6 rounded-xl bg-card border border-border transition-all duration-300",
        isHighlighted && "verse-highlight bg-secondary/5",
        "animate-fade-in"
      )}
      style={{ animationDelay: `${verse.number * 0.05}s` }}
    >
      {/* Verse Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">
              {verse.number}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {surahNumber}:{verse.number}
          </span>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onPlay}
          className="rounded-full hover:bg-primary/10"
          aria-label={isPlaying ? "Pause" : "Écouter ce verset"}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5 text-primary" />
          ) : (
            <Play className="h-5 w-5 text-primary" />
          )}
        </Button>
      </div>

      {/* Arabic Text */}
      <p className="arabic-text text-2xl md:text-3xl text-foreground leading-loose mb-4 text-right">
        {verse.text}
      </p>

      {/* Translation */}
      <p className="text-muted-foreground text-base leading-relaxed border-t border-border pt-4">
        {verse.translation}
      </p>
    </div>
  );
};
