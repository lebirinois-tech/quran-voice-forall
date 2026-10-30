import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useT } from '@/lib/i18n';
import { surahs } from '@/data/surahs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import { buildVocabulary, matchesVerse, normalizeArabic, searchTokens, suggestWords, verseSearchUrl, type IndexedVerse, type SearchVerse } from '@/lib/quranSearch';

interface VerseEntry {
  numberInSurah: number;
  text: string;
  page: number;
  juz: number;
}

type Corpus = Record<string, { arabic: VerseEntry[] }>;

const RESULT_BATCH = 50;

const QuranSearch = () => {
  const navigate = useNavigate();
  const appSettings = useAppSettings();
  const t = useT();
  const [query, setQuery] = useState('');
  const [exactWord, setExactWord] = useState(false);
  const [visibleCount, setVisibleCount] = useState(RESULT_BATCH);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
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
    const entries: IndexedVerse[] = [];
    for (const [surahKey, surahData] of Object.entries(corpus)) {
      const surahNum = parseInt(surahKey, 10);
      for (const v of surahData.arabic) {
        entries.push({
          surah: surahNum,
          verse: v.numberInSurah,
          page: v.page,
          juz: v.juz,
          text: v.text,
          tokens: searchTokens(v.text),
        });
      }
    }
    return entries;
  }, [corpus]);

  const vocabulary = useMemo(() => buildVocabulary(index ?? []), [index]);
  const suggestions = useMemo(() => exactWord ? [] : suggestWords(vocabulary, query), [vocabulary, query, exactWord]);
  const results = useMemo(() => (index ?? []).filter(entry => matchesVerse(entry, query, exactWord)), [index, query, exactWord]);

  const selectSuggestion = (word: string) => {
    const words = searchTokens(query);
    words.splice(-1, 1, normalizeArabic(word));
    setQuery(words.join(' '));
    setExactWord(true);
    setVisibleCount(RESULT_BATCH);
    setActiveSuggestion(-1);
  };

  const goToVerse = useCallback(
    (r: SearchVerse) => navigate(verseSearchUrl(r)),
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
            onChange={(e) => {
              setQuery(e.target.value);
              setExactWord(false);
              setVisibleCount(RESULT_BATCH);
              setActiveSuggestion(-1);
            }}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={suggestions.length > 0}
            aria-controls="quran-word-suggestions"
            aria-activedescendant={activeSuggestion >= 0 ? `quran-suggestion-${activeSuggestion}` : undefined}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' && suggestions.length) {
                e.preventDefault();
                setActiveSuggestion(current => (current + 1) % suggestions.length);
              } else if (e.key === 'ArrowUp' && suggestions.length) {
                e.preventDefault();
                setActiveSuggestion(current => (current + suggestions.length - 1) % suggestions.length);
              } else if (e.key === 'Enter' && activeSuggestion >= 0) {
                e.preventDefault();
                const suggestion = suggestions[activeSuggestion];
                if (suggestion) selectSuggestion(suggestion.word);
              } else if (e.key === 'Escape') {
                setExactWord(true);
                setActiveSuggestion(-1);
              }
            }}
            className="pl-10 h-12 text-lg bg-card border-border font-amiri"
            aria-label={t('quranSearchTitle')}
            autoFocus
          />
        </div>

        {suggestions.length > 0 && (
          <div id="quran-word-suggestions" role="listbox" aria-label={t('quranWordSuggestions')} className="mb-4 border border-border rounded-lg bg-card divide-y divide-border">
            {suggestions.map((suggestion, i) => (
              <Button key={suggestion.normalized} id={`quran-suggestion-${i}`} role="option"
                aria-selected={i === activeSuggestion} variant="ghost"
                className={`w-full justify-between h-auto min-h-11 rounded-none ${i === activeSuggestion ? 'bg-accent' : ''}`}
                onClick={() => selectSuggestion(suggestion.word)}>
                <span dir="rtl" className="font-amiri text-xl">{suggestion.word}</span>
                <span className="text-xs text-muted-foreground">{suggestion.occurrences} {t('quranSearchResults')}</span>
              </Button>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>{t('checking')}</span>
          </div>
        )}

        {error && (
          <p className="text-center text-destructive py-8">{t('quranSearchError')}</p>
        )}

        {!loading && !error && normalizeArabic(query).length >= 1 && (
          <p className="text-sm text-muted-foreground mb-3 text-center">
            {`${results.length} ${t('quranSearchResults')}`}
          </p>
        )}

        <div className="space-y-3">
          {results.slice(0, visibleCount).map((r) => {
            const surah = surahs.find((s) => s.number === r.surah);
            return (
              <Button
                key={`${r.surah}:${r.verse}`}
                type="button"
                variant="ghost"
                onClick={() => goToVerse(r)}
                className="block h-auto w-full whitespace-normal text-start bg-card border border-border rounded-lg p-4 hover:bg-accent/10 transition-colors"
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
                  {r.text.split(/(\s+)/).map((part, i) => matchesVerse({ ...r, tokens: [normalizeArabic(part)] }, query, exactWord)
                    ? <mark key={i} className="bg-secondary/30 text-foreground rounded-sm">{part}</mark>
                    : part)}
                </p>
              </Button>
            );
          })}
        </div>

        {results.length > visibleCount && (
          <div className="text-center mt-4">
            <Button variant="outline" onClick={() => setVisibleCount(count => count + RESULT_BATCH)}>{t('quranSearchMore')}</Button>
          </div>
        )}

        {!loading && !error && normalizeArabic(query).length >= 1 && results.length === 0 && (
          <p className="text-center text-muted-foreground py-8">{t('quranSearchNoResults')}</p>
        )}

        <div className="text-center mt-8">
          <Link to="/index">
            <Button variant="outline">{t('backHome')}</Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default QuranSearch;
