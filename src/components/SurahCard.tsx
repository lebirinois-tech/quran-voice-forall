import { Surah } from '@/data/surahs';
import { cn } from '@/lib/utils';

interface SurahCardProps {
  surah: Surah;
  onClick: () => void;
  isSelected?: boolean;
}

export const SurahCard = ({ surah, onClick, isSelected }: SurahCardProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-xl bg-card border border-border card-hover focus-accessible",
        "flex items-center gap-4 text-left transition-all duration-300",
        isSelected && "border-primary bg-primary/5 shadow-soft"
      )}
      aria-label={`Ouvrir ${surah.name}`}
    >
      {/* Surah Number Badge */}
      <div className="surah-badge w-12 h-14 flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
        {surah.number}
      </div>

      {/* Surah Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-foreground truncate">
            {surah.name}
          </h3>
          <span className="font-amiri text-xl text-primary shrink-0">
            {surah.nameArabic}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-muted-foreground">
            {surah.englishName}
          </span>
          <span className="text-xs text-muted-foreground/60">•</span>
          <span className="text-xs text-muted-foreground">
            {surah.versesCount} versets
          </span>
        </div>
        <span className={cn(
          "inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium",
          surah.revelationType === 'Meccan' 
            ? "bg-primary/10 text-primary" 
            : "bg-secondary/20 text-secondary-foreground"
        )}>
          {surah.revelationType === 'Meccan' ? 'Mecquoise' : 'Médinoise'}
        </span>
      </div>
    </button>
  );
};
