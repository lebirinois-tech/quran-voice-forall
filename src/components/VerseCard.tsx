import { Verse, getVersePage, surahs } from '@/data/surahs';
import { cn } from '@/lib/utils';
import { Play, Pause, Loader2, FileText } from 'lucide-react';
import { Button } from './ui/button';

interface VerseCardProps {
  id?: string;
  verse: Verse;
  surahNumber: number;
  isPlaying?: boolean;
  isHighlighted?: boolean;
  isLoading?: boolean;
  onPlay?: () => void;
}

export const VerseCard = ({ 
  id,
  verse, 
  surahNumber, 
  isPlaying, 
  isHighlighted,
  isLoading,
  onPlay 
}: VerseCardProps) => {
  const surah = surahs.find(s => s.number === surahNumber);
  const pageNumber = verse.page || getVersePage(surahNumber, verse.number, surah?.versesCount || 1);

  return (
    <div
      id={id}
      className={cn(
        "p-6 rounded-xl bg-card border border-border transition-all duration-300",
        isHighlighted && "verse-highlight bg-secondary/5 ring-2 ring-primary/20",
        isPlaying && "bg-primary/5",
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
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">
              {surahNumber}:{verse.number}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Page {pageNumber}
            </span>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onPlay}
          disabled={isLoading}
          className="rounded-full hover:bg-primary/10"
          aria-label={isPlaying ? "Pause" : "Écouter ce verset"}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-5 w-5 text-primary" />
          ) : (
            <Play className="h-5 w-5 text-primary" />
          )}
        </Button>
      </div>

      {/* Arabic Text */}
      <p className="arabic-text text-2xl md:text-3xl text-destructive leading-loose mb-4 text-right font-amiri">
        {verse.text}
      </p>

      {/* Translation */}
      <p className="text-muted-foreground text-base leading-relaxed border-t border-border pt-4">
        {verse.translation}
      </p>
    </div>
  );
};
