import { useState, useEffect, useCallback, useRef } from 'react';
import { BookOpen, Volume2, VolumeX, Loader2, ChevronDown, ChevronUp, Languages } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { getCachedTafsir, saveTafsirToCache } from '@/hooks/useTafsirCache';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TafsirPanelProps {
  surahNumber: number;
  verseNumber: number;
  isOpen: boolean;
  onToggle: () => void;
}

const FR_CACHE_PREFIX = 'quran-tafsir-fr-';
const EN_CACHE_PREFIX = 'quran-tafsir-en-';

const getCachedTranslation = (prefix: string, surah: number, verse: number): string | null => {
  try {
    const raw = localStorage.getItem(`${prefix}${surah}`);
    if (!raw) return null;
    const data = JSON.parse(raw) as Record<number, string>;
    return data[verse] || null;
  } catch { return null; }
};

const saveTranslationToCache = (prefix: string, surah: number, verse: number, text: string) => {
  try {
    const key = `${prefix}${surah}`;
    const existing = JSON.parse(localStorage.getItem(key) || '{}');
    existing[verse] = text;
    localStorage.setItem(key, JSON.stringify(existing));
  } catch { /* ignore quota */ }
};

export const TafsirPanel = ({ surahNumber, verseNumber, isOpen, onToggle }: TafsirPanelProps) => {
  const [tafsirText, setTafsirText] = useState<string | null>(null);
  const [tafsirFr, setTafsirFr] = useState<string | null>(null);
  const [tafsirEn, setTafsirEn] = useState<string | null>(null);
  const [translatingFr, setTranslatingFr] = useState(false);
  const [translatingEn, setTranslatingEn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [speakingLang, setSpeakingLang] = useState<'ar' | 'fr' | 'en' | null>(null);
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
    if (!isOpen && speakingLang) {
      stopSpeaking();
    }
  }, [isOpen]);

  const fetchTafsir = async () => {
    setIsLoading(true);
    setError(null);

    // Check offline cache first
    const cached = getCachedTafsir(surahNumber, verseNumber);
    if (cached) {
      setTafsirText(cached);
    } else {
      try {
        const response = await fetch(
          `https://api.alquran.cloud/v1/ayah/${surahNumber}:${verseNumber}/ar.muyassar`
        );
        const data = await response.json();

        if (data.code === 200 && data.data?.text) {
          setTafsirText(data.data.text);
          saveTafsirToCache(surahNumber, verseNumber, data.data.text);
        } else {
          const fallbackResponse = await fetch(
            `https://api.alquran.cloud/v1/ayah/${surahNumber}:${verseNumber}/ar.jalalayn`
          );
          const fallbackData = await fallbackResponse.json();
          if (fallbackData.code === 200 && fallbackData.data?.text) {
            setTafsirText(fallbackData.data.text);
            saveTafsirToCache(surahNumber, verseNumber, fallbackData.data.text);
          } else {
            throw new Error('التفسير غير متوفر');
          }
        }
      } catch (err) {
        console.error('Tafsir fetch error:', err);
        setError('التفسير غير متوفر حالياً / Tafsir non disponible');
      }
    }

    // Load any previously translated tafsir from cache (no auto-fetch)
    setTafsirFr(getCachedTranslation(FR_CACHE_PREFIX, surahNumber, verseNumber));
    setTafsirEn(getCachedTranslation(EN_CACHE_PREFIX, surahNumber, verseNumber));

    setIsLoading(false);
  };

  const translateTafsir = async (lang: 'fr' | 'en') => {
    if (!tafsirText) return;
    const setLoading = lang === 'fr' ? setTranslatingFr : setTranslatingEn;
    const setText = lang === 'fr' ? setTafsirFr : setTafsirEn;
    const prefix = lang === 'fr' ? FR_CACHE_PREFIX : EN_CACHE_PREFIX;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate-tafsir', {
        body: { text: tafsirText, targetLang: lang },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const translation = data?.translation as string | undefined;
      if (translation) {
        setText(translation);
        saveTranslationToCache(prefix, surahNumber, verseNumber, translation);
      } else {
        throw new Error('Empty translation');
      }
    } catch (e: any) {
      console.error('Translation error:', e);
      toast.error(lang === 'fr' ? 'Échec de la traduction' : 'Translation failed', {
        description: e?.message || String(e),
      });
    } finally {
      setLoading(false);
    }
  };

  const speakTafsir = useCallback(async (lang: 'ar' | 'fr' | 'en', textToSpeak: string) => {
    if (!textToSpeak || !('speechSynthesis' in window)) return;

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
        synth.onvoiceschanged = () => { done(); };
        setTimeout(done, 800);
      });
    };

    const splitText = (text: string, maxLen = 220) => {
      const cleaned = text.replace(/\s+/g, ' ').trim();
      if (cleaned.length <= maxLen) return [cleaned];

      const parts = cleaned.split(/(?<=[\.!؟\?؛،])\s+/).map((s) => s.trim()).filter(Boolean);
      const chunks: string[] = [];
      let buf = '';
      for (const p of parts) {
        if (!buf) { buf = p; continue; }
        if ((buf + ' ' + p).length <= maxLen) { buf = buf + ' ' + p; }
        else { chunks.push(buf); buf = p; }
      }
      if (buf) chunks.push(buf);
      return chunks.length ? chunks : [cleaned];
    };

    try {
      const synth = window.speechSynthesis;
      notifyTtsStart();
      synth.cancel();
      synth.resume();
      await new Promise((r) => setTimeout(r, 350));

      const voices = await ensureVoices();
      if (sessionId !== speakSessionIdRef.current) { notifyTtsEnd(); return; }

      const pickVoice = (target: 'ar' | 'fr' | 'en') => {
        const prefix = target;
        return voices.find((v) => v.lang?.toLowerCase().startsWith(prefix))
          || voices.find((v) => v.name?.toLowerCase().includes(
            target === 'ar' ? 'arab' : target === 'fr' ? 'french' : 'english'
          ));
      };
      const chosenVoice = pickVoice(lang);

      const chunks = splitText(textToSpeak);
      let idx = 0;
      const speakNext = () => {
        if (sessionId !== speakSessionIdRef.current) return;
        if (idx >= chunks.length) { setSpeakingLang(null); notifyTtsEnd(); return; }

        const u = new SpeechSynthesisUtterance(chunks[idx++]);
        u.rate = 0.9; u.pitch = 1; u.volume = 1;
        if (chosenVoice) { u.voice = chosenVoice; u.lang = chosenVoice.lang; }
        else { u.lang = lang; }

        u.onstart = () => setSpeakingLang(lang);
        u.onend = () => speakNext();
        u.onerror = (event) => { console.error('Speech error:', event.error); setSpeakingLang(null); notifyTtsEnd(); };
        synth.speak(u);
      };
      speakNext();
    } catch (e) {
      console.error('Speech synthesis failed:', e);
      setSpeakingLang(null);
      notifyTtsEnd();
    }
  }, [notifyTtsStart, notifyTtsEnd]);

  const stopSpeaking = useCallback(() => {
    speakSessionIdRef.current += 1;
    window.speechSynthesis.cancel();
    setSpeakingLang(null);
    notifyTtsEnd();
  }, [notifyTtsEnd]);

  const toggleSpeech = (lang: 'ar' | 'fr' | 'en', text: string | null) => {
    if (speakingLang === lang) { stopSpeaking(); return; }
    if (speakingLang) { stopSpeaking(); }
    if (text) speakTafsir(lang, text);
  };

  return (
    <div className="mt-3 border-t border-border/50 pt-3">
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
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

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
              <Button variant="outline" size="sm" onClick={fetchTafsir} className="mt-2">
                إعادة المحاولة / Réessayer
              </Button>
            </div>
          ) : tafsirText ? (
            <>
              <div className="flex justify-end mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleSpeech('ar', tafsirText)}
                  className={cn("gap-2", speakingLang === 'ar' && "bg-primary/10 border-primary")}
                >
                  {speakingLang === 'ar' ? (
                    <><VolumeX className="h-4 w-4" /><span>إيقاف / Arrêter</span></>
                  ) : (
                    <><Volume2 className="h-4 w-4" /><span>استماع / Écouter</span></>
                  )}
                </Button>
              </div>
              <div className="font-arabic text-xl leading-loose text-foreground text-right" dir="rtl">
                {tafsirText}
              </div>

              {/* Translation buttons */}
              <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => translateTafsir('fr')}
                  disabled={translatingFr}
                  className="gap-2"
                >
                  {translatingFr ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Languages className="h-4 w-4" />
                  )}
                  <span>🇫🇷 {tafsirFr ? 'Retraduire' : 'Traduire en français'}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => translateTafsir('en')}
                  disabled={translatingEn}
                  className="gap-2"
                >
                  {translatingEn ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Languages className="h-4 w-4" />
                  )}
                  <span>🇬🇧 {tafsirEn ? 'Retranslate' : 'Translate to English'}</span>
                </Button>
              </div>

              {tafsirFr && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <p className="text-xs font-semibold text-primary">🇫🇷 Tafsir traduit en français</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleSpeech('fr', tafsirFr)}
                      className={cn("gap-2 h-8", speakingLang === 'fr' && "bg-primary/10 border-primary")}
                    >
                      {speakingLang === 'fr' ? (
                        <><VolumeX className="h-4 w-4" /><span className="text-xs">Arrêter</span></>
                      ) : (
                        <><Volume2 className="h-4 w-4" /><span className="text-xs">Écouter</span></>
                      )}
                    </Button>
                  </div>
                  <p className="text-base leading-relaxed text-foreground" dir="ltr" lang="fr">
                    {tafsirFr}
                  </p>
                </div>
              )}
              {tafsirEn && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <p className="text-xs font-semibold text-primary">🇬🇧 Tafsir translated to English</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleSpeech('en', tafsirEn)}
                      className={cn("gap-2 h-8", speakingLang === 'en' && "bg-primary/10 border-primary")}
                    >
                      {speakingLang === 'en' ? (
                        <><VolumeX className="h-4 w-4" /><span className="text-xs">Stop</span></>
                      ) : (
                        <><Volume2 className="h-4 w-4" /><span className="text-xs">Listen</span></>
                      )}
                    </Button>
                  </div>
                  <p className="text-base leading-relaxed text-foreground" dir="ltr" lang="en">
                    {tafsirEn}
                  </p>
                </div>
              )}
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
