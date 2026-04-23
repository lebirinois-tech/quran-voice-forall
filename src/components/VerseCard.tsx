import { Verse, getVersePage, surahs } from '@/data/surahs';
import { cn } from '@/lib/utils';
import { sanitizeTajweedHtml } from '@/lib/sanitize';
import { Play, Pause, Loader2, FileText, Download, Bookmark, Share2, Volume2, Square } from 'lucide-react';
import { Button } from './ui/button';
import { RECITERS, ReciterId } from '@/hooks/useQuranAudio';
import { TextDisplayStyle, FontSize } from '@/hooks/useAppSettings';
import { useTtsLang } from '@/hooks/useTtsLang';
import { useEnglishTranslation } from '@/hooks/useEnglishTranslation';
import { toast } from 'sonner';
import { useState, useEffect, useRef } from 'react';
import { TafsirPanel } from './TafsirPanel';

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
  const [ttsLang] = useTtsLang();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [speakingLang, setSpeakingLang] = useState<'fr' | 'en' | null>(null);

  const {
    text: enTranslation,
    isLoading: isLoadingEn,
    error: enError,
  } = useEnglishTranslation(surahNumber, verse.number, !hideText);

  useEffect(() => {
    return () => {
      if (utteranceRef.current && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const ensureVoices = async (): Promise<SpeechSynthesisVoice[]> => {
    const synth = window.speechSynthesis;
    const existing = synth.getVoices();

    if (existing.length > 0) {
      return existing;
    }

    return new Promise((resolve) => {
      let settled = false;

      const finish = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        synth.removeEventListener('voiceschanged', handleVoicesChanged);
        resolve(synth.getVoices());
      };

      const handleVoicesChanged = () => finish();
      const timeoutId = window.setTimeout(finish, 700);

      synth.addEventListener('voiceschanged', handleVoicesChanged);
    });
  };

  const pickMaleVoice = (lang: 'fr' | 'en'): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = lang === 'fr' ? 'fr' : 'en';
    const langVoices = voices.filter(v => v.lang.toLowerCase().startsWith(langPrefix));
    // Prefer voices with "male" or known male names
    const maleHints = ['male', 'homme', 'thomas', 'daniel', 'paul', 'henri', 'nicolas', 'alex', 'fred', 'george', 'james', 'david', 'mark'];
    const male = langVoices.find(v => maleHints.some(h => v.name.toLowerCase().includes(h)));
    return male || langVoices[0] || null;
  };

  const handleSpeak = async (lang: 'fr' | 'en' = ttsLang) => {
    if (!('speechSynthesis' in window)) {
      toast.error('Synthèse vocale non supportée');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeakingLang(null);
      return;
    }

    // CRITICAL: create the utterance synchronously inside the user gesture.
    // Awaiting before `new SpeechSynthesisUtterance(...)` breaks autoplay
    // on installed PWAs (iOS/Android/desktop).
    const utterance = new SpeechSynthesisUtterance('');
    utterance.lang = lang === 'fr' ? 'fr-FR' : 'en-US';
    utterance.pitch = 0.9;
    utterance.rate = 0.95;
    utterance.onend = () => { setIsSpeaking(false); setSpeakingLang(null); };
    utterance.onerror = (e) => {
      console.error('TTS error', e);
      setIsSpeaking(false);
      setSpeakingLang(null);
    };

    // Try to set voice synchronously (works if voices already loaded — common case).
    const syncVoice = pickMaleVoice(lang);
    if (syncVoice) utterance.voice = syncVoice;

    utteranceRef.current = utterance;
    window.speechSynthesis.cancel();

    const speakNow = (textToSpeak: string) => {
      utterance.text = textToSpeak;
      setIsSpeaking(true);
      setSpeakingLang(lang);
      window.speechSynthesis.speak(utterance);
    };

    if (lang === 'fr') {
      speakNow(verse.translation);
      return;
    }

    // English path
    if (enTranslation) {
      speakNow(enTranslation);
      return;
    }

    // English not yet loaded — fetch on demand, then speak.
    // The utterance was created in the gesture context, so speak() should still
    // work in most browsers (Chrome/Edge/Firefox). On strict iOS Safari this may
    // require a second tap; we surface a hint.
    try {
      setIsSpeaking(true);
      setSpeakingLang(lang);
      const res = await fetch(`https://api.alquran.cloud/v1/ayah/${surahNumber}:${verse.number}/en.sahih`);
      const data = await res.json();
      const fetched = data?.data?.text as string | undefined;
      if (!fetched) throw new Error('No English text');
      utterance.text = fetched;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('English TTS load failed', err);
      setIsSpeaking(false);
      setSpeakingLang(null);
      toast.error('Traduction anglaise indisponible — réessayez');
    }
  };

  // Stop speaking if language changes mid-playback
  useEffect(() => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ttsLang]);
  
  // Alternate background colors based on page number (odd/even)
  const isEvenPage = pageNumber % 2 === 0;

  // Sanitize Tajweed HTML to prevent XSS attacks
  const effectiveTajweedHtml =
    textDisplayStyle === 'tajweed'
      ? sanitizeTajweedHtml(tajweedHtml || (verse.text.includes('[') ? parseTajweedFallback(verse.text) : undefined) || '')
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
      ) : textDisplayStyle === 'tajweed' && effectiveTajweedHtml ? (
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
        <div className="border-t border-border pt-4">
          {/* French translation (always visible) */}
          <p className="text-muted-foreground text-base leading-relaxed">
            <span className="text-xs font-semibold text-primary mr-2">FR</span>
            {verse.translation}
          </p>

          {/* English translation (shown when EN selected) */}
          {ttsLang === 'en' && (
            <p className="text-muted-foreground text-base leading-relaxed mt-3 italic">
              <span className="text-xs font-semibold text-primary mr-2 not-italic">EN</span>
              {enTranslation
                ? enTranslation
                : isLoadingEn
                  ? 'Loading English translation…'
                  : 'English translation unavailable'}
            </p>
          )}

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Button
              variant={isSpeaking && speakingLang === 'fr' ? "secondary" : "outline"}
              size="sm"
              onClick={() => handleSpeak('fr')}
              className="rounded-full h-8 text-xs gap-1.5"
              aria-label={isSpeaking && speakingLang === 'fr' ? "Arrêter la lecture française" : "Écouter la traduction française (voix masculine)"}
            >
              {isSpeaking && speakingLang === 'fr' ? (
                <Square className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
              {isSpeaking && speakingLang === 'fr' ? '🇫🇷 Arrêter' : '🇫🇷 Écouter'}
            </Button>

            <Button
              variant={isSpeaking && speakingLang === 'en' ? "secondary" : "outline"}
              size="sm"
              onClick={() => handleSpeak('en')}
              disabled={isSpeaking && speakingLang === 'fr'}
              className="rounded-full h-8 text-xs gap-1.5"
              aria-label={isSpeaking && speakingLang === 'en' ? "Stop English playback" : "Listen to English translation (male voice)"}
            >
              {isLoadingEn && !enTranslation ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isSpeaking && speakingLang === 'en' ? (
                <Square className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
              {isSpeaking && speakingLang === 'en' ? '🇬🇧 Stop' : '🇬🇧 Listen'}
            </Button>
          </div>
        </div>
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
