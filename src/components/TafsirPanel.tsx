import { useState, useEffect } from 'react';
import { BookOpen, Volume2, VolumeX, Loader2, ChevronDown, ChevronUp, Languages } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { getCachedTafsir, saveTafsirToCache } from '@/hooks/useTafsirCache';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getOfflineTafsir } from '@/lib/offlineTafsir';
import { useTafsirSpeech } from '@/hooks/useTafsirSpeech';

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
  const { speakingLang, toggle } = useTafsirSpeech(`${surahNumber}:${verseNumber}:${isOpen}`);
  const toggleSpeech = (lang: 'ar' | 'fr' | 'en', text: string | null) => { if (text) void toggle(lang, text); };
  const [error, setError] = useState<string | null>(null);

  // Fetch Tafsir when panel opens
  useEffect(() => {
    if (isOpen && !tafsirText && !isLoading) {
      fetchTafsir();
    }
  }, [isOpen, surahNumber, verseNumber]);

  const fetchTafsir = async () => {
    setIsLoading(true);
    setError(null);

    // 1) Offline bundle first (Arabic Al-Muyassar — ships with the app)
    let ar = await getOfflineTafsir(surahNumber, verseNumber, 'ar');
    if (!ar) ar = getCachedTafsir(surahNumber, verseNumber);

    if (!ar) {
      // 2) Network fallback if for some reason the bundle isn't available yet
      try {
        const response = await fetch(
          `https://api.alquran.cloud/v1/ayah/${surahNumber}:${verseNumber}/ar.muyassar`
        );
        const data = await response.json();
        if (data.code === 200 && data.data?.text) ar = data.data.text;
      } catch (err) {
        console.error('Tafsir fetch error:', err);
      }
    }

    if (ar) {
      setTafsirText(ar);
      saveTafsirToCache(surahNumber, verseNumber, ar);
    } else {
      setError('التفسير غير متوفر حالياً / Tafsir non disponible');
    }

    // French — bundled offline (Traduction Al-Montada). No AI/credits required.
    let fr = await getOfflineTafsir(surahNumber, verseNumber, 'fr');
    if (!fr) fr = getCachedTranslation(FR_CACHE_PREFIX, surahNumber, verseNumber);
    if (fr) {
      setTafsirFr(fr);
      saveTranslationToCache(FR_CACHE_PREFIX, surahNumber, verseNumber, fr);
    } else {
      setTafsirFr(null);
    }
    // English — bundled offline (Tafsir Al-Mukhtasar). No AI/credits required.
    let en = await getOfflineTafsir(surahNumber, verseNumber, 'en');
    if (!en) en = getCachedTranslation(EN_CACHE_PREFIX, surahNumber, verseNumber);
    if (en) {
      setTafsirEn(en);
      saveTranslationToCache(EN_CACHE_PREFIX, surahNumber, verseNumber, en);
    } else {
      setTafsirEn(null);
    }

    setIsLoading(false);
  };

  const translateTafsir = async (lang: 'fr' | 'en') => {
    if (!tafsirText) return;
    const setLoading = lang === 'fr' ? setTranslatingFr : setTranslatingEn;
    const setText = lang === 'fr' ? setTafsirFr : setTafsirEn;
    const prefix = lang === 'fr' ? FR_CACHE_PREFIX : EN_CACHE_PREFIX;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.info(lang === 'fr' ? 'Connectez-vous pour demander une traduction supplémentaire.' : 'Sign in to request an additional translation.');
        return;
      }
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
          <span className="text-sm">التفسير / Tafsir</span>
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
