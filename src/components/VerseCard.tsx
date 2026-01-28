import { Verse, getVersePage, surahs } from '@/data/surahs';
import { cn } from '@/lib/utils';
import { Play, Pause, Loader2, FileText, Download } from 'lucide-react';
import { Button } from './ui/button';
import { RECITERS, ReciterId } from '@/hooks/useQuranAudio';
import { TextDisplayStyle } from '@/hooks/useAppSettings';
import { toast } from 'sonner';
import { useState } from 'react';

// Safety net: if tajweed text ever arrives unparsed (e.g. contains [h:1[...]),
// convert it to colored HTML so we never render the raw markers to the user.
// Using Dar Al-Maarifah standard color scheme
const parseTajweedFallback = (text: string): string => {
  const tajweedColors: Record<string, string> = {
    // Gray - Letters not pronounced
    h: '#707070', s: '#707070', l: '#707070',
    // Red shades - Madd
    n: '#A00000', p: '#E74C3C', m: '#8B0000', o: '#C0392B',
    // Blue - Qalqalah
    q: '#4A90D9',
    // Green - Nasalization
    c: '#27AE60', f: '#27AE60', w: '#27AE60', i: '#27AE60',
    a: '#27AE60', g: '#27AE60',
    // Gray - Idgham (not pronounced)
    u: '#707070', d: '#707070', b: '#707070',
  };

  let html = text;

  Object.entries(tajweedColors).forEach(([marker, color]) => {
    const regex = new RegExp(`\\[${marker}(?::\\d+)?\\[([^\\]]+)\\]`, 'g');
    html = html.replace(regex, `<span style="color: ${color};">$1</span>`);
  });

  // Cleanup any leftovers
  html = html.replace(/\[[a-z](?::\d+)?\[?/gi, '');
  html = html.replace(/\]/g, '');

  return html;
};

interface VerseCardProps {
  id?: string;
  verse: Verse;
  surahNumber: number;
  isPlaying?: boolean;
  isHighlighted?: boolean;
  isLoading?: boolean;
  reciter?: ReciterId;
  textDisplayStyle?: TextDisplayStyle;
  tajweedHtml?: string;
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
  textDisplayStyle = 'tajweed',
  tajweedHtml,
  onPlay 
}: VerseCardProps) => {
  const surah = surahs.find(s => s.number === surahNumber);
  const pageNumber = verse.page || getVersePage(surahNumber, verse.number, surah?.versesCount || 1);
  const [isDownloading, setIsDownloading] = useState(false);

  const effectiveTajweedHtml =
    textDisplayStyle === 'tajweed'
      ? (tajweedHtml || (verse.text.includes('[') ? parseTajweedFallback(verse.text) : undefined))
      : undefined;

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

  // Choose the appropriate text style class
  const getTextClassName = () => {
    switch (textDisplayStyle) {
      case 'tajweed':
        return 'quran-text text-3xl md:text-4xl leading-relaxed';
      case 'simple':
        return 'font-amiri text-3xl md:text-4xl leading-relaxed text-foreground';
      case 'mushaf':
        return 'quran-text text-2xl md:text-3xl leading-loose';
      default:
        return 'quran-text text-3xl md:text-4xl leading-relaxed';
    }
  };

  return (
    <div
      id={id}
      className={cn(
        "p-6 rounded-xl bg-card border border-border transition-all duration-300",
        isHighlighted && "verse-highlight bg-secondary/5 ring-2 ring-primary/20",
        isPlaying && "bg-primary/5",
        textDisplayStyle === 'mushaf' && "bg-ivory/50 dark:bg-card",
        "animate-fade-in"
      )}
      style={{ animationDelay: `${verse.number * 0.05}s` }}
    >
      {/* Verse Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            textDisplayStyle === 'mushaf' 
              ? "bg-primary text-primary-foreground" 
              : "bg-primary/10"
          )}>
            <span className={cn(
              "text-sm font-semibold",
              textDisplayStyle === 'mushaf' ? "text-primary-foreground" : "text-primary"
            )}>
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
      {textDisplayStyle === 'tajweed' && effectiveTajweedHtml ? (
        <p 
          className={cn(getTextClassName(), "mb-4 text-right tajweed-text")}
          dir="rtl"
          dangerouslySetInnerHTML={{ __html: effectiveTajweedHtml }}
        />
      ) : (
        <p 
          className={cn(getTextClassName(), "mb-4 text-right")}
          dir="rtl"
        >
          {verse.text}
        </p>
      )}

      {/* Translation */}
      <p className="text-muted-foreground text-base leading-relaxed border-t border-border pt-4">
        {verse.translation}
      </p>
    </div>
  );
};
