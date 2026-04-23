import { Verse, getVersePage, surahs } from '@/data/surahs';
import { cn } from '@/lib/utils';
import { sanitizeTajweedHtml } from '@/lib/sanitize';
import { Play, Pause, Loader2, FileText, Download, Bookmark, Share2, Volume2, VolumeX } from 'lucide-react';
import { Button } from './ui/button';
import { RECITERS, ReciterId } from '@/hooks/useQuranAudio';
import { TextDisplayStyle, FontSize } from '@/hooks/useAppSettings';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { TafsirPanel } from './TafsirPanel';
import { speakTranslation, stopSpeech, isSpeechSupported, TranslationLang } from '@/lib/translationSpeech';

// Safety net: if tajweed text ever arrives unparsed (e.g. contains [h:1[...]),
// convert it to colored HTML so we never render the raw markers to the user.
// ═══════════════════════════════════════════════════════════════════════════
// FROZEN TAJWEED COLOR SCHEME - DO NOT MODIFY
// User confirmed on 2026-01-28: Qalqalah=Blue, Madd=Red, Ghunnah=Green
// ═══════════════════════════════════════════════════════════════════════════
const parseTajweedFallback = (text: string): string => {
  const tajweedColors: Record<string, string> = {
    // Gray - Silent / Idgham without Ghunnah
    h: '#AAAAAA', s: '#AAAAAA', l: '#AAAAAA', u: '#AAAAAA', d: '#AAAAAA', b: '#AAAAAA',
    // Green - Ghunnah
    g: '#2AAD2A',
    // Red - Ikhfa / Madd
    f: '#DD0000', c: '#DD0000', n: '#DD0000', p: '#CC0000', m: '#BB0000', o: '#AA0000',
    // Violet - Idgham with Ghunnah
    a: '#B266D9', w: '#B266D9',
    // Blue - Qalqalah
    q: '#2E6ECB',
    // Orange - Iqlab
    i: '#D4740C',
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

const hasFragmentedArabicShaping = (html: string): boolean => {
  const fragments = html.match(/<span[^>]*>(.*?)<\/span>/g) || [];
  const shortArabicFragments = fragments.filter((fragment) => {
    const plainText = fragment.replace(/<[^>]+>/g, '').trim();
    const arabicOnly = plainText.replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g, '');
    return arabicOnly.length > 0 && arabicOnly.length <= 2;
  }).length;

  return shortArabicFragments > 2;
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
  fontSize?: FontSize;
  tajweedHtml?: string;
  warshText?: string;
  pageNumber?: number;
  onPlay?: () => void;
  onBookmark?: () => void;
  isBookmarked?: boolean;
  /** Hide Arabic text and translation (for memorization mode) */
  hideText?: boolean;
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
  fontSize = 'medium',
  tajweedHtml,
  warshText,
  pageNumber: propPageNumber,
  onPlay,
  onBookmark,
  isBookmarked,
  hideText = false,
}: VerseCardProps) => {
  const surah = surahs.find(s => s.number === surahNumber);
  const pageNumber = propPageNumber || verse.page || getVersePage(surahNumber, verse.number, surah?.versesCount || 1);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isTafsirOpen, setIsTafsirOpen] = useState(false);
  const [speakingLang, setSpeakingLang] = useState<TranslationLang | null>(null);

  // Stop speech when component unmounts
  useEffect(() => {
    return () => {
      if (speakingLang) stopSpeech();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detect language of the primary translation based on script heuristic
  const detectLang = (text: string): TranslationLang => {
    // Simple heuristic: French has more accented chars, English has none
    return /[àâçéèêëîïôûùüÿœæ]/i.test(text) ? 'fr' : 'en';
  };

  const handleSpeakTranslation = (text: string, lang: TranslationLang) => {
    if (!isSpeechSupported()) {
      toast.error('Lecture vocale non supportée par ce navigateur');
      return;
    }
    if (speakingLang === lang) {
      stopSpeech();
      setSpeakingLang(null);
      return;
    }
    setSpeakingLang(lang);
    speakTranslation({
      text,
      lang,
      onEnd: () => setSpeakingLang(null),
      onError: () => {
        setSpeakingLang(null);
        toast.error('Erreur de lecture vocale');
      },
    });
  };
  
  // Alternate background colors based on page number (odd/even)
  const isEvenPage = pageNumber % 2 === 0;

  // Sanitize Tajweed HTML to prevent XSS attacks
  const effectiveTajweedHtml =
    textDisplayStyle === 'tajweed'
      ? sanitizeTajweedHtml(tajweedHtml || (verse.text.includes('[') ? parseTajweedFallback(verse.text) : undefined) || '')
      : undefined;
  const shouldUsePlainArabicFallback = textDisplayStyle === 'tajweed';

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

  const handleShare = async () => {
    const surahName = surah?.name || `Sourate ${surahNumber}`;
    const text = `${verse.text}\n\n${verse.translation}\n\n— ${surahName} (${surahNumber}:${verse.number})`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: `${surahName} - Verset ${verse.number}`, text });
      } catch (e) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Verset copié dans le presse-papier');
    }
  };

  // Map fontSize setting to Tailwind classes
  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'small': return 'text-3xl md:text-4xl';
      case 'medium': return 'text-4xl md:text-5xl';
      case 'large': return 'text-5xl md:text-6xl';
      case 'xlarge': return 'text-6xl md:text-7xl';
      default: return 'text-4xl md:text-5xl';
    }
  };

  // Choose the appropriate text style class
  const getTextClassName = () => {
    const sizeClass = getFontSizeClass();
    switch (textDisplayStyle) {
      case 'tajweed':
        return `quran-text ${sizeClass} leading-relaxed`;
      case 'simple':
        return `font-amiri ${sizeClass} leading-relaxed text-foreground`;
      case 'warsh-text':
        return `font-amiri ${sizeClass} leading-loose text-foreground`;
      case 'warsh-tajweed':
        return `font-warsh ${sizeClass} leading-loose text-foreground`;
      case 'mushaf-hafs':
      case 'mushaf-warsh':
        return `quran-text ${sizeClass} leading-loose`;
      default:
        return `quran-text ${sizeClass} leading-relaxed`;
    }
  };

  return (
    <div
      id={id}
      className={cn(
        "p-6 rounded-xl border border-border transition-all duration-300",
        // Page-based alternating background colors
        isEvenPage 
          ? "bg-primary/5 dark:bg-primary/10" 
          : "bg-secondary/5 dark:bg-secondary/10",
        isPlaying && "verse-playing ring-2 ring-primary/40",
        isHighlighted && !isPlaying && "verse-highlight ring-2 ring-primary/20",
        (textDisplayStyle === 'mushaf-hafs' || textDisplayStyle === 'mushaf-warsh') && "bg-ivory/50 dark:bg-card",
        "animate-fade-in"
      )}
      style={{ animationDelay: `${verse.number * 0.05}s` }}
    >
      {/* Verse Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            (textDisplayStyle === 'mushaf-hafs' || textDisplayStyle === 'mushaf-warsh')
              ? "bg-primary text-primary-foreground" 
              : "bg-primary/10"
          )}>
            <span className={cn(
              "text-sm font-semibold",
              (textDisplayStyle === 'mushaf-hafs' || textDisplayStyle === 'mushaf-warsh') ? "text-primary-foreground" : "text-primary"
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
            onClick={handleShare}
            className="rounded-full hover:bg-primary/10"
            aria-label="Partager le verset"
          >
            <Share2 className="h-4 w-4 text-primary" />
          </Button>
          {onBookmark && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBookmark}
              className={cn(
                "rounded-full hover:bg-primary/10",
                isBookmarked && "bg-primary/10"
              )}
              aria-label="Marquer comme progression"
            >
              <Bookmark className={cn(
                "h-4 w-4",
                isBookmarked ? "text-primary fill-primary" : "text-muted-foreground"
              )} />
            </Button>
          )}
          
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
      {hideText ? (
        <div className="mb-4 py-8 text-center rounded-lg bg-muted/30 border border-dashed border-border">
          <p className="text-muted-foreground text-sm">🎤 Texte masqué — Mode mémorisation</p>
        </div>
      ) : textDisplayStyle === 'tajweed' && effectiveTajweedHtml && !shouldUsePlainArabicFallback ? (
        <p 
          className={cn(getTextClassName(), "mb-4 text-right tajweed-text")}
          dir="rtl"
          dangerouslySetInnerHTML={{ __html: effectiveTajweedHtml }}
        />
      ) : textDisplayStyle === 'warsh-tajweed' && warshText ? (
        <p 
          className={cn(getTextClassName(), "mb-4 text-right")}
          dir="rtl"
        >
          {warshText}
        </p>
      ) : (
        <p 
          className={cn(getTextClassName(), "mb-4 text-right")}
          dir="rtl"
        >
          {verse.text}
        </p>
      )}

      {/* Translation */}
      {hideText ? null : (
        <>
          {(() => {
            const primaryLang = detectLang(verse.translation);
            return (
              <div className="border-t border-border pt-4 flex items-start gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleSpeakTranslation(verse.translation, primaryLang)}
                  className="rounded-full hover:bg-primary/10 shrink-0 h-8 w-8 mt-0.5"
                  aria-label={`Écouter la traduction (${primaryLang === 'fr' ? 'français' : 'anglais'})`}
                  title={`🔊 ${primaryLang === 'fr' ? 'Français' : 'English'}`}
                >
                  {speakingLang === primaryLang ? (
                    <VolumeX className="h-4 w-4 text-primary animate-pulse" />
                  ) : (
                    <Volume2 className="h-4 w-4 text-primary" />
                  )}
                </Button>
                <p className="text-muted-foreground text-base leading-relaxed flex-1">
                  {verse.translation}
                </p>
              </div>
            );
          })()}
          {verse.translation2 && (() => {
            const secondaryLang = detectLang(verse.translation2);
            return (
              <div className="border-t border-border pt-4 mt-4 flex items-start gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleSpeakTranslation(verse.translation2!, secondaryLang)}
                  className="rounded-full hover:bg-primary/10 shrink-0 h-8 w-8 mt-0.5"
                  aria-label={`Écouter la traduction (${secondaryLang === 'fr' ? 'français' : 'anglais'})`}
                  title={`🔊 ${secondaryLang === 'fr' ? 'Français' : 'English'}`}
                >
                  {speakingLang === secondaryLang ? (
                    <VolumeX className="h-4 w-4 text-primary animate-pulse" />
                  ) : (
                    <Volume2 className="h-4 w-4 text-primary" />
                  )}
                </Button>
                <p className="text-muted-foreground text-base leading-relaxed flex-1">
                  {verse.translation2}
                </p>
              </div>
            );
          })()}
        </>
      )}

      {/* Tafsir Panel */}
      <TafsirPanel
        surahNumber={surahNumber}
        verseNumber={verse.number}
        isOpen={isTafsirOpen}
        onToggle={() => setIsTafsirOpen(!isTafsirOpen)}
      />
    </div>
  );
};
