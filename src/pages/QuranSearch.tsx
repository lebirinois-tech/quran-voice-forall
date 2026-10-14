import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useT } from '@/lib/i18n';
import { surahs } from '@/data/surahs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';

interface VerseEntry {
  numberInSurah: number;
  text: string;
  page: number;
  juz: number;
}

type Corpus = Record<string, { arabic: VerseEntry[] }>;

interface SearchResult {
  surah: number;
  verse: number;
  page: number;
  juz: number;
  text: string;
}

/** Normalize Arabic for search: strip diacritics/tatweel, unify alef/hamza/ya/taa marbuta forms. */
const normalizeArabic = (s: string): string =>
  s
    .replace(/[ً-ٰٟۖ-ۭ]/g, '')
    .replace(/ـ/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();

const MAX_RESULTS = 100;

const QuranSearch = () => {
  const navigate = useNavigate();
  const appSettings = useAppSettings();
  const t = useT();
  const [query, setQuery] = useState('');
  const [corpus, setCorpus] = useState<Corpus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/quran-hafs-fr.json')
      .then((r) => {
        if (!r.ok) throw new Error('fetch failed');
        return r.json();
      })
      .then((data: Corpus) => {
        if (!cancelled) {
          setCorpus(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Pre-normalized flat index, built once when corpus loads.
  const index = useMemo(() => {
    if (!corpus) return null;
    const entries: Array<SearchResult & { normalized: string }> = [];
    for (const [surahKey, surahData] of Object.entries(corpus)) {
      const surahNum = parseInt(surahKey, 10);
      for (const v of surahData.arabic) {
        entries.push({
          surah: surahNum,
          verse: v.numberInSurah,
          page: v.page,
          juz: v.juz,
          text: v.text,
          normalized: normalizeArabic(v.text),
        });
      }
    }
    return entries;
  }, [corpus]);

  const results = useMemo(() => {
    if (!index) return [];
    const q = normalizeArabic(query);
    if (q.length < 2) return [];
    const words = q.split(' ').filter(Boolean);
    const matches: SearchResult[] = [];
    for (const entry of index) {
      if (words.every((w) => entry.normalized.includes(w))) {
        matches.push(entry);
        if (matches.length >= MAX_RESULTS) break;
      }
    }
    return matches;
  }, [index, query]);

  const goToVerse = useCallback(
    (r: SearchResult) => {
      navigate(`/surah/${r.surah}?verse=${r.verse}`);
    },
    [navigate]
  );

  return (
    <div className="min-h-screen pattern-islamic" style={{ backgroundColor: appSettings.backgroundColor }}>
      <Header
        onAccessibilityToggle={() => {}}
        isAccessibilityMode={false}
        reciter={appSettings.reciter}
        onReciterChange={appSettings.onReciterChange}
        backgroundColor={appSettings.backgroundColor}
        onBackgroundColorChange={appSettings.onBackgroundColorChange}
        textDisplayStyle={appSettings.textDisplayStyle}
        onTextDisplayStyleChange={appSettings.onTextDisplayStyleChange}
        fontSize={appSettings.fontSize}
        onFontSizeChange={appSettings.onFontSizeChange}
      />

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4 text-center">
          {t('quranSearchTitle')}
        </h2>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            dir="rtl"
            placeholder={t('quranSearchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 h-12 text-lg bg-card border-border font-amiri"
            aria-label={t('quranSearchTitle')}
            autoFocus
          />
        </div>

        <p className="text-xs text-muted-foreground text-center mb-6">{t('quranSearchHint')}</p>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>{t('checking')}</span>
          </div>
        )}

        {error && (
          <p className="text-center text-destructive py-8">{t('quranSearchError')}</p>
        )}

        {!loading && !error && query.trim().length >= 2 && (
          <p className="text-sm text-muted-foreground mb-3 text-center">
            {results.length >= MAX_RESULTS
              ? `${MAX_RESULTS}+ ${t('quranSearchResults')}`
              : `${results.length} ${t('quranSearchResults')}`}
          </p>
        )}

        <div className="space-y-3">
          {results.map((r) => {
            const surah = surahs.find((s) => s.number === r.surah);
            return (
              <button
                key={`${r.surah}:${r.verse}`}
                type="button"
                onClick={() => goToVerse(r)}
                className="w-full text-start bg-card border border-border rounded-xl p-4 hover:bg-accent/10 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-semibold text-primary">
                    {surah ? `${surah.number}. ${surah.name} — ${surah.nameArabic}` : `${t('surahs')} ${r.surah}`}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {t('verse')} {r.verse} · {t('pages')} {r.page}
                  </span>
                </div>
                <p dir="rtl" className="font-amiri text-lg leading-loose text-foreground">
                  {r.text}
                </p>
              </button>
            );
          })}
        </div>

        {!loading && !error && query.trim().length >= 2 && results.length === 0 && (
          <p className="text-center text-muted-foreground py-8">{t('quranSearchNoResults')}</p>
        )}

        <div className="text-center mt-8">
          <Link to="/index">
            <Button variant="outline">{t('home')}</Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default QuranSearch;
