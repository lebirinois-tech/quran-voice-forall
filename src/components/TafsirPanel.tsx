import { useState, useEffect, useCallback, useRef } from 'react';
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

  const speakSessionIdRef = useRef(0);
  const ttsActiveRef = useRef(false);

  const notifyTtsStart = useCallback(() => {
    if (ttsActiveRef.current) return;
    ttsActiveRef.current = true;
    window.dispatchEvent(new CustomEvent('app:tts-start'));
  }, []);

  const notifyTtsEnd = useCallback(() => {
    if (!ttsActiveRef.current) return;
    ttsActiveRef.current = false;
    window.dispatchEvent(new CustomEvent('app:tts-end'));
  }, []);

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

  const speakTafsir = useCallback(async () => {
    if (!tafsirText || !('speechSynthesis' in window)) return;

    // Incrémenter la session pour invalider toute lecture précédente
    const sessionId = ++speakSessionIdRef.current;

    const ensureVoices = async (): Promise<SpeechSynthesisVoice[]> => {
      const synth = window.speechSynthesis;
      const initial = synth.getVoices();
      if (initial.length > 0) return initial;

      return await new Promise((resolve) => {
        const prev = synth.onvoiceschanged;
        const done = () => {
          const v = synth.getVoices();
          synth.onvoiceschanged = prev ?? null;
          resolve(v);
        };

        synth.onvoiceschanged = () => {
          done();
        };

        // Fallback: ne pas rester bloqué
        setTimeout(done, 800);
      });
    };

    const splitText = (text: string, maxLen = 220) => {
      const cleaned = text.replace(/\s+/g, ' ').trim();
      if (cleaned.length <= maxLen) return [cleaned];

      const parts = cleaned
        .split(/(?<=[\.!؟\?؛،])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const chunks: string[] = [];
      let buf = '';
      for (const p of parts) {
        if (!buf) {
          buf = p;
          continue;
        }
        if ((buf + ' ' + p).length <= maxLen) {
          buf = buf + ' ' + p;
        } else {
          chunks.push(buf);
          buf = p;
        }
      }
      if (buf) chunks.push(buf);
      return chunks.length ? chunks : [cleaned];
    };

    try {
      const synth = window.speechSynthesis;

      // IMPORTANT: pause voice recognition ASAP (it can interrupt TTS on mobile)
      notifyTtsStart();

      synth.cancel();
      // Certains navigateurs restent en pause
      synth.resume();

      // Give the browser time to fully cancel any audio session / release mic focus
      await new Promise((r) => setTimeout(r, 350));

      const voices = await ensureVoices();
      // Si l'utilisateur a relancé entre-temps, on abandonne
      if (sessionId !== speakSessionIdRef.current) {
        notifyTtsEnd();
        return;
      }

      const arabicVoice = voices.find(
        (v) => v.lang?.toLowerCase().startsWith('ar') || v.name?.toLowerCase().includes('arab')
      );

      const chunks = splitText(tafsirText);

      let idx = 0;
      const speakNext = () => {
        if (sessionId !== speakSessionIdRef.current) return;
        if (idx >= chunks.length) {
          setIsSpeaking(false);
          notifyTtsEnd();
          return;
        }

        const u = new SpeechSynthesisUtterance(chunks[idx++]);
        u.rate = 0.9;
        u.pitch = 1;
        u.volume = 1;

        if (arabicVoice) {
          u.voice = arabicVoice;
          u.lang = arabicVoice.lang;
        } else {
          // Laisser le navigateur choisir une voix disponible
          u.lang = 'ar';
        }

        u.onstart = () => setIsSpeaking(true);
        u.onend = () => speakNext();
        u.onerror = (event) => {
          console.error('Speech error:', event.error);
          setIsSpeaking(false);
          notifyTtsEnd();
        };

        synth.speak(u);
      };

      speakNext();
    } catch (e) {
      console.error('Speech synthesis failed:', e);
      setIsSpeaking(false);
      notifyTtsEnd();
    }
  }, [tafsirText, notifyTtsStart, notifyTtsEnd]);

  const stopSpeaking = useCallback(() => {
    // Invalidate any running queue
    speakSessionIdRef.current += 1;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    notifyTtsEnd();
  }, [notifyTtsEnd]);

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
