import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Languages, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { cn } from '@/lib/utils';
import { sanitizeTajweedHtml } from '@/lib/sanitize';
import { getPrimaryThemeForVerse } from '@/data/quranThemes';
import { getOfflineTafsir } from '@/lib/offlineTafsir';
import { getOfflineVerseTranslation } from '@/lib/offlineVerseTranslations';

type Lang = 'ar' | 'fr' | 'en';

interface MushafVerseStudyProps {
  surahNumber: number;
  verseNumber: number;
  arabicHtml: string;
}

const languageLabels: Record<Lang, string> = {
  ar: 'العربية',
  fr: 'Français',
  en: 'English',
};

const sectionLabels: Record<Lang, { verse: string; tafsir: string; unavailable: string }> = {
  ar: { verse: 'الآية الكريمة', tafsir: 'التفسير الميسر', unavailable: 'المحتوى غير متوفر' },
  fr: { verse: 'Traduction du verset', tafsir: 'Tafsir du verset', unavailable: 'Contenu indisponible' },
  en: { verse: 'Verse translation', tafsir: 'Verse tafsir', unavailable: 'Content unavailable' },
};

export const MushafVerseStudy = ({ surahNumber, verseNumber, arabicHtml }: MushafVerseStudyProps) => {
  const [activeLang, setActiveLang] = useState<Lang>('fr');
  const [translations, setTranslations] = useState<Partial<Record<Lang, string>>>({});
  const [tafsirs, setTafsirs] = useState<Partial<Record<Lang, string>>>({});
  const [loading, setLoading] = useState(true);
  const theme = useMemo(() => getPrimaryThemeForVerse(surahNumber, verseNumber), [surahNumber, verseNumber]);
  const safeArabicHtml = useMemo(() => sanitizeTajweedHtml(arabicHtml), [arabicHtml]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getOfflineVerseTranslation(surahNumber, verseNumber, 'fr'),
      getOfflineVerseTranslation(surahNumber, verseNumber, 'en'),
      getOfflineTafsir(surahNumber, verseNumber, 'ar'),
      getOfflineTafsir(surahNumber, verseNumber, 'fr'),
      getOfflineTafsir(surahNumber, verseNumber, 'en'),
    ]).then(([fr, en, arTafsir, frTafsir, enTafsir]) => {
      if (cancelled) return;
      setTranslations({ fr: fr ?? undefined, en: en ?? undefined });
      setTafsirs({ ar: arTafsir ?? undefined, fr: frTafsir ?? undefined, en: enTafsir ?? undefined });
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [surahNumber, verseNumber]);

  return (
    <Tabs value={activeLang} onValueChange={(value) => setActiveLang(value as Lang)} className="min-w-0">
      <TabsList className="grid h-auto w-full grid-cols-3">
        {(Object.keys(languageLabels) as Lang[]).map((lang) => (
          <TabsTrigger key={lang} value={lang} className="min-w-0 px-1.5 text-xs sm:text-sm">
            {languageLabels[lang]}
          </TabsTrigger>
        ))}
      </TabsList>

      {(Object.keys(languageLabels) as Lang[]).map((lang) => {
        const labels = sectionLabels[lang];
        const translation = lang === 'ar' ? null : translations[lang];
        const tafsir = tafsirs[lang];
        return (
          <TabsContent key={lang} value={lang} className="mt-4 space-y-4">
            <section
              className="overflow-hidden rounded-md border"
              style={{ borderColor: theme ? `hsl(${theme.hsl} / 0.45)` : undefined }}
            >
              <div
                className="flex items-center gap-2 border-b px-3 py-2 text-sm font-semibold"
                style={{ backgroundColor: theme ? `hsl(${theme.bgHsl} / 0.7)` : undefined }}
              >
                <Languages className="h-4 w-4 text-primary" />
                {labels.verse}
              </div>
              {lang === 'ar' ? (
                <p
                  dir="rtl"
                  className="quran-text px-4 py-4 text-right text-2xl leading-[2.4]"
                  dangerouslySetInnerHTML={{ __html: safeArabicHtml }}
                />
              ) : loading ? (
                <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : (
                <p className="px-4 py-4 text-sm leading-7 sm:text-base">{translation ?? labels.unavailable}</p>
              )}
            </section>

            <section
              className="overflow-hidden rounded-md border"
              style={{ borderColor: theme ? `hsl(${theme.hsl} / 0.45)` : undefined }}
            >
              <div
                className="flex items-center gap-2 border-b px-3 py-2 text-sm font-semibold"
                style={{ backgroundColor: theme ? `hsl(${theme.bgHsl} / 0.7)` : undefined }}
              >
                <BookOpen className="h-4 w-4 text-primary" />
                {labels.tafsir}
              </div>
              {loading ? (
                <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : (
                <p
                  dir={lang === 'ar' ? 'rtl' : 'ltr'}
                  className={cn('px-4 py-4 text-sm leading-7 sm:text-base', lang === 'ar' && 'font-arabic text-right text-lg leading-9')}
                >
                  {tafsir ?? labels.unavailable}
                </p>
              )}
            </section>
          </TabsContent>
        );
      })}
    </Tabs>
  );
};