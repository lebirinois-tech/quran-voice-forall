import { Verse, getVersePage, surahs } from '@/data/surahs';
import { cn } from '@/lib/utils';
import { Play, Pause, Loader2, FileText, Download } from 'lucide-react';
import { Button } from './ui/button';
import { RECITERS, ReciterId } from '@/hooks/useQuranAudio';
import { toast } from 'sonner';
import { useState } from 'react';

interface VerseCardProps {
  id?: string;
  verse: Verse;
  surahNumber: number;
  isPlaying?: boolean;
  isHighlighted?: boolean;
  isLoading?: boolean;
  reciter?: ReciterId;
  onPlay?: () => void;
}

export const VerseCard = ({ 
  id,
  verse, 
  surahNumber, 
  isPlaying, 
  isHighlighted,
  isLoading,
  reciter = 'alafasy',
  onPlay 
}: VerseCardProps) => {
  const surah = surahs.find(s => s.number === surahNumber);
  const pageNumber = verse.page || getVersePage(surahNumber, verse.number, surah?.versesCount || 1);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const edition = RECITERS[reciter].id;
      const response = await fetch(`https://api.alquran.cloud/v1/ayah/${surahNumber}:${verse.number}/${edition}`);
      const data = await response.json();
      
      if (data.code === 200 && data.data?.audio) {
        const audioResponse = await fetch(data.data.audio);
        const blob = await audioResponse.blob();
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${surah?.name || 'Surah'}_${surahNumber}_Verset_${verse.number}_${RECITERS[reciter].name}.mp3`;
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
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            disabled={isDownloading}
            className="rounded-full hover:bg-primary/10"
            aria-label="Télécharger l'audio"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            ) : (
              <Download className="h-4 w-4 text-primary" />
            )}
          </Button>
          
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
      </div>

      {/* Arabic Text */}
      <p className="arabic-text text-2xl md:text-3xl leading-loose mb-4 text-right font-amiri text-red-600">
        {verse.text}
      </p>

      {/* Translation */}
      <p className="text-muted-foreground text-base leading-relaxed border-t border-border pt-4">
        {verse.translation}
      </p>
    </div>
  );
};
