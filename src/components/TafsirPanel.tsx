import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Volume2, VolumeX, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface TafsirPanelProps {
  surahNumber: number;
  verseNumber: number;
  isOpen: boolean;
  onToggle: () => void;
}

export const TafsirPanel = ({ surahNumber, verseNumber, isOpen, onToggle }: TafsirPanelProps) => {
  const [tafsirText, setTafsirText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Tafsir when panel opens
  useEffect(() => {
    if (isOpen && !tafsirText && !isLoading) {
      fetchTafsir();
    }
  }, [isOpen, surahNumber, verseNumber]);

  // Stop speech when panel closes
  useEffect(() => {
    if (!isOpen && isSpeaking) {
      stopSpeaking();
    }
  }, [isOpen]);

  const fetchTafsir = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Using Al Quran Cloud API with Arabic Tafsir (Muyassar - simplified tafsir)
      const response = await fetch(
        `https://api.alquran.cloud/v1/ayah/${surahNumber}:${verseNumber}/ar.muyassar`
      );
      const data = await response.json();
      
      if (data.code === 200 && data.data?.text) {
        setTafsirText(data.data.text);
      } else {
        // Fallback to Ibn Kathir if Muyassar not available
        const fallbackResponse = await fetch(
          `https://api.alquran.cloud/v1/ayah/${surahNumber}:${verseNumber}/ar.jalalayn`
        );
        const fallbackData = await fallbackResponse.json();
        
        if (fallbackData.code === 200 && fallbackData.data?.text) {
          setTafsirText(fallbackData.data.text);
        } else {
          throw new Error('التفسير غير متوفر');
        }
      }
    } catch (err) {
      console.error('Tafsir fetch error:', err);
      setError('التفسير غير متوفر حالياً / Tafsir non disponible');
    } finally {
      setIsLoading(false);
    }
  };

  const speakTafsir = useCallback(() => {
    if (!tafsirText || !('speechSynthesis' in window)) {
      console.log('Speech synthesis not available or no text');
      return;
    }

    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    const startSpeech = () => {
      const utterance = new SpeechSynthesisUtterance(tafsirText);
      utterance.lang = 'ar-SA';
      utterance.rate = 0.9;
      utterance.pitch = 1;

      // Try to find an Arabic voice
      const voices = window.speechSynthesis.getVoices();
      console.log('Available voices:', voices.length);
      
      const arabicVoice = voices.find(voice => 
        voice.lang.startsWith('ar') || voice.name.toLowerCase().includes('arabic')
      );
      
      if (arabicVoice) {
        utterance.voice = arabicVoice;
        console.log('Using Arabic voice:', arabicVoice.name);
      } else {
        console.log('No Arabic voice found, using default');
      }

      utterance.onstart = () => {
        console.log('Speech started');
        setIsSpeaking(true);
      };
      utterance.onend = () => {
        console.log('Speech ended');
        setIsSpeaking(false);
      };
      utterance.onerror = (event) => {
        console.error('Speech error:', event.error);
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    };

    // Voices may not be loaded yet, wait for them
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      // Wait for voices to load
      window.speechSynthesis.onvoiceschanged = () => {
        startSpeech();
        window.speechSynthesis.onvoiceschanged = null;
      };
      // Fallback timeout - start anyway after 500ms
      setTimeout(() => {
        if (!isSpeaking) {
          startSpeech();
        }
      }, 500);
    } else {
      startSpeech();
    }
  }, [tafsirText, isSpeaking]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const toggleSpeech = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speakTafsir();
    }
  };

  return (
    <div className="mt-3 border-t border-border/50 pt-3">
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="w-full justify-between text-muted-foreground hover:text-foreground hover:bg-primary/5"
      >
        <span className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          <span className="text-sm">التفسير الموضوعي / Tafsir</span>
        </span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="mt-3 p-4 rounded-lg bg-muted/30 border border-border/50 animate-fade-in">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
              <span className="mr-2 text-muted-foreground">جاري التحميل...</span>
            </div>
          ) : error ? (
            <div className="text-center py-4 text-muted-foreground">
              <p>{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchTafsir}
                className="mt-2"
              >
                إعادة المحاولة / Réessayer
              </Button>
            </div>
          ) : tafsirText ? (
            <>
              {/* Speech Control */}
              <div className="flex justify-end mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSpeech}
                  className={cn(
                    "gap-2",
                    isSpeaking && "bg-primary/10 border-primary"
                  )}
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX className="h-4 w-4" />
                      <span>إيقاف / Arrêter</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-4 w-4" />
                      <span>استماع / Écouter</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Tafsir Text */}
              <div 
                className="font-arabic text-xl leading-loose text-foreground text-right"
                dir="rtl"
              >
                {tafsirText}
              </div>

              <p className="text-xs text-muted-foreground mt-4 text-center">
                المصدر: تفسير الميسر / Source: Tafsir Al-Muyassar
              </p>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};
