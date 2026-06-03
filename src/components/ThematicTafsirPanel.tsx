import { useState, useEffect } from 'react';
import { Sparkles, Loader2, ChevronDown, ChevronUp, Volume2, VolumeX } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getThemesForVerse, QuranTheme } from '@/data/quranThemes';

type Lang = 'ar' | 'fr' | 'en';

// v2: invalidate caches from before language enforcement fix
const CACHE_PREFIX = 'quran-tafsir-mawdou3i-v2-';

const cacheKey = (s: number, v: number, lang: Lang) => `${CACHE_PREFIX}${lang}-${s}-${v}`;

const readCache = (s: number, v: number, lang: Lang): string | null => {
  try { return localStorage.getItem(cacheKey(s, v, lang)); } catch { return null; }
};
const writeCache = (s: number, v: number, lang: Lang, text: string) => {
  try { localStorage.setItem(cacheKey(s, v, lang), text); } catch { /* quota */ }
};

interface Props {
  surahNumber: number;
  verseNumber: number;
  isOpen: boolean;
  onToggle: () => void;
}

export const ThematicTafsirPanel = ({ surahNumber, verseNumber, isOpen, onToggle }: Props) => {
  const themes = getThemesForVerse(surahNumber, verseNumber);
  const [activeLang, setActiveLang] = useState<Lang>('fr');
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [speakingLang, setSpeakingLang] = useState<Lang | null>(null);

  // Load from cache when panel opens or lang changes
  useEffect(() => {
    if (!isOpen) return;
    setText(readCache(surahNumber, verseNumber, activeLang));
  }, [isOpen, activeLang, surahNumber, verseNumber]);

  // Stop speech on close
  useEffect(() => {
    if (!isOpen && speakingLang) {
      window.speechSynthesis?.cancel();
      setSpeakingLang(null);
    }
  }, [isOpen, speakingLang]);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('thematic-tafsir', {
        body: {
          surah: surahNumber,
          verse: verseNumber,
          lang: activeLang,
          themes: themes.map((t) => t.labels.en),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const generated = (data?.text as string | undefined)?.trim();
      if (!generated) throw new Error('Empty response');
      setText(generated);
      writeCache(surahNumber, verseNumber, activeLang, generated);
    } catch (e: any) {
      console.error('thematic-tafsir error', e);
      toast.error(
        activeLang === 'fr'
          ? 'Échec de la génération du tafsir thématique'
          : activeLang === 'en'
            ? 'Failed to generate thematic tafsir'
            : 'فشل توليد التفسير الموضوعي',
        { description: e?.message || String(e) },
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleSpeak = (lang: Lang, t: string) => {
    if (!('speechSynthesis' in window)) return;
    if (speakingLang === lang) {
      window.speechSynthesis.cancel();
      setSpeakingLang(null);
      return;
    }
    window.speechSynthesis.cancel();
    const chunks = t.replace(/\s+/g, ' ').match(/.{1,220}(\s|$)/g) || [t];
    let i = 0;
    const speakNext = () => {
      if (i >= chunks.length) { setSpeakingLang(null); return; }
      const u = new SpeechSynthesisUtterance(chunks[i++]);
      u.lang = lang === 'fr' ? 'fr-FR' : lang === 'en' ? 'en-US' : 'ar-SA';
      u.rate = 0.9;
      u.onend = speakNext;
      u.onerror = () => setSpeakingLang(null);
      window.speechSynthesis.speak(u);
    };
    setSpeakingLang(lang);
    speakNext();
  };

  // Don't render if no curated themes for this verse
  if (themes.length === 0) return null;

  return (
    <div className="mt-3 border-t border-border/50 pt-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="w-full justify-between text-muted-foreground hover:text-foreground hover:bg-primary/5"
      >
        <span className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm">التفسير الموضوعي / Tafsir thématique / Thematic Tafsir</span>
        </span>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      {isOpen && (
        <div className="mt-3 p-4 rounded-lg bg-muted/30 border border-border/50 animate-fade-in space-y-4">
          {/* Themes badges */}
          <div className="flex flex-wrap gap-2">
            {themes.map((t: QuranTheme) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border"
                style={{
                  backgroundColor: `hsl(${t.hsl} / 0.15)`,
                  borderColor: `hsl(${t.hsl} / 0.5)`,
                  color: `hsl(${t.hsl})`,
                }}
              >
                <span>{t.emoji}</span>
                <span>{t.labels[activeLang]}</span>
              </span>
            ))}
          </div>

          {/* Lang selector */}
          <div className="flex gap-1 p-1 rounded-lg bg-background/50 border border-border/50">
            {(['ar', 'fr', 'en'] as Lang[]).map((l) => (
              <Button
                key={l}
                variant={activeLang === l ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveLang(l)}
                className="flex-1 h-8 text-xs"
              >
                {l === 'ar' ? '🇸🇦 العربية' : l === 'fr' ? '🇫🇷 Français' : '🇬🇧 English'}
              </Button>
            ))}
          </div>

          {/* Theme descriptions (always available, curated) */}
          <div className="space-y-2">
            {themes.map((t) => (
              <p
                key={`desc-${t.id}`}
                className={cn('text-sm leading-relaxed', activeLang === 'ar' && 'font-arabic text-base text-right')}
                dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
              >
                <span className="font-semibold" style={{ color: `hsl(${t.hsl})` }}>
                  {t.emoji} {t.labels[activeLang]} :
                </span>{' '}
                <span className="text-foreground">{t.descriptions[activeLang]}</span>
              </p>
            ))}
          </div>

          {/* AI-generated verse-specific thematic explanation */}
          <div className="pt-3 border-t border-border/50">
            {text ? (
              <>
                <div className="flex items-center justify-between mb-2 gap-2">
                  <p className="text-xs font-semibold text-primary">
                    ✨ {activeLang === 'fr' ? 'Explication pour ce verset' : activeLang === 'en' ? 'Explanation for this verse' : 'شرح لهذه الآية'}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleSpeak(activeLang, text)}
                    className={cn('gap-2 h-8', speakingLang === activeLang && 'bg-primary/10 border-primary')}
                  >
                    {speakingLang === activeLang ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    <span className="text-xs">
                      {activeLang === 'fr' ? (speakingLang === 'fr' ? 'Arrêter' : 'Écouter')
                        : activeLang === 'en' ? (speakingLang === 'en' ? 'Stop' : 'Listen')
                        : (speakingLang === 'ar' ? 'إيقاف' : 'استماع')}
                    </span>
                  </Button>
                </div>
                <p
                  className={cn('text-sm leading-relaxed text-foreground', activeLang === 'ar' && 'font-arabic text-lg text-right leading-loose')}
                  dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
                >
                  {text}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generate}
                  disabled={loading}
                  className="mt-2 text-xs gap-1.5"
                >
                  {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {activeLang === 'fr' ? 'Régénérer' : activeLang === 'en' ? 'Regenerate' : 'إعادة التوليد'}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={generate}
                disabled={loading}
                className="w-full gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {activeLang === 'fr'
                  ? 'Générer une explication thématique pour ce verset'
                  : activeLang === 'en'
                    ? 'Generate a thematic explanation for this verse'
                    : 'توليد شرح موضوعي لهذه الآية'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
