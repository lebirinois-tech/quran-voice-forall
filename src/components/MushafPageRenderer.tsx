import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getThemesForVerse } from '@/data/quranThemes';

// Quran.com QPC v2 font + per-page verse data (open source, used by quran.com).
// One font file per page (≈40-60 KB). Cached by the browser + Service Worker.
const FONT_URLS = (page: number) => [
  `https://cdn.jsdelivr.net/gh/quran/quran.com-frontend-next@production/public/fonts/quran/hafs/v2/woff2/p${page}.woff2`,
  `https://raw.githubusercontent.com/quran/quran.com-frontend-next/production/public/fonts/quran/hafs/v2/woff2/p${page}.woff2`,
];
const API_URL = (page: number) =>
  `https://api.quran.com/api/v4/verses/by_page/${page}?words=true&word_fields=code_v2,line_number,page_number,position&per_page=300`;

interface Word {
  code_v2: string;
  line_number: number;
  page_number: number;
  position: number;
  char_type_name: string;
}
interface Verse {
  id: number;
  verse_key: string; // "15:1"
  verse_number: number;
  words: Word[];
}

const CACHE_PREFIX = 'qpc-page-v1-';
const loadedFonts = new Set<number>();
const dataCache = new Map<number, Verse[]>();

const loadFont = async (page: number): Promise<void> => {
  if (loadedFonts.has(page)) return;
  if (typeof FontFace === 'undefined') return;
  const urls = FONT_URLS(page);
  for (const url of urls) {
    try {
      const face = new FontFace(`p${page}`, `url(${url}) format('woff2')`, {
        display: 'swap',
      });
      const loaded = await face.load();
      document.fonts.add(loaded);
      loadedFonts.add(page);
      return;
    } catch (e) {
      console.warn(`QPC font for page ${page} failed at ${url}:`, e);
    }
  }
};

const loadPageData = async (page: number): Promise<Verse[]> => {
  if (dataCache.has(page)) return dataCache.get(page)!;
  try {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${page}`);
    if (cached) {
      const parsed = JSON.parse(cached) as Verse[];
      dataCache.set(page, parsed);
      return parsed;
    }
  } catch {/* ignore */}
  const res = await fetch(API_URL(page));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const verses: Verse[] = json.verses ?? [];
  dataCache.set(page, verses);
  try {
    localStorage.setItem(`${CACHE_PREFIX}${page}`, JSON.stringify(verses));
  } catch {/* quota */}
  return verses;
};

interface Props {
  page: number;
  currentVerse?: number;
  currentSurah?: number;
  isAudioPlaying?: boolean;
  onVerseClick?: (surah: number, verse: number) => void;
}

export const MushafPageRenderer = ({
  page,
  currentVerse,
  currentSurah,
  isAudioPlaying,
  onVerseClick,
}: Props) => {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fontReady, setFontReady] = useState(false);
  const currentRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setFontReady(loadedFonts.has(page));

    Promise.all([loadPageData(page), loadFont(page)])
      .then(([v]) => {
        if (cancelled) return;
        setVerses(v);
        setFontReady(true);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Erreur');
      })
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, [page]);

  // Group words by line, preserving verse ownership
  const lines = useMemo(() => {
    const byLine = new Map<number, Array<{ word: Word; verse: Verse }>>();
    for (const v of verses) {
      for (const w of v.words) {
        const arr = byLine.get(w.line_number) ?? [];
        arr.push({ word: w, verse: v });
        byLine.set(w.line_number, arr);
      }
    }
    return Array.from(byLine.entries())
      .sort(([a], [b]) => a - b)
      .map(([line, items]) => ({
        line,
        items: items.sort((a, b) => a.word.position - b.word.position),
      }));
  }, [verses]);

  // Scroll current verse into view
  useEffect(() => {
    if (currentRef.current) {
      currentRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [currentVerse, currentSurah]);

  if (loading && !verses.length) {
    return (
      <div className="aspect-[3/4] flex items-center justify-center rounded-xl border border-border bg-[hsl(40,45%,92%)]">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="aspect-[3/4] flex items-center justify-center rounded-xl border border-border bg-muted/50 text-muted-foreground p-4 text-sm text-center">
        Impossible de charger la page : {error}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-border shadow-lg bg-[hsl(40,45%,94%)] p-4 sm:p-6',
        isAudioPlaying && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
      style={{ direction: 'rtl' }}
    >
      <div
        className="flex flex-col"
        style={{
          fontFamily: `"p${page}", "KFGQPC Uthman Taha Naskh", serif`,
          fontSize: 'clamp(20px, 5.2vw, 30px)',
          lineHeight: 2.1,
          color: 'hsl(20 15% 15%)',
        }}
      >
        {lines.map(({ line, items }) => {
          // Group consecutive words of same verse into one span (so we can color the verse background)
          const groups: Array<{ verse: Verse; words: Word[] }> = [];
          for (const { word, verse } of items) {
            const last = groups[groups.length - 1];
            if (last && last.verse.id === verse.id) last.words.push(word);
            else groups.push({ verse, words: [word] });
          }
          return (
            <div key={line} className="flex flex-wrap justify-center items-center">
              {groups.map((g, gi) => {
                const [surahStr, verseStr] = g.verse.verse_key.split(':');
                const sn = parseInt(surahStr, 10);
                const vn = parseInt(verseStr, 10);
                const themes = getThemesForVerse(sn, vn);
                const primary = themes[0];
                const isCurrent =
                  currentSurah === sn && currentVerse === vn;
                const bg = primary
                  ? `hsl(${primary.hsl} / 0.18)`
                  : 'transparent';
                return (
                  <span
                    key={`${g.verse.id}-${gi}`}
                    ref={isCurrent && gi === 0 ? currentRef : undefined}
                    onClick={() => onVerseClick?.(sn, vn)}
                    title={primary ? `${primary.emoji} ${primary.labels.fr}` : `Verset ${vn}`}
                    className={cn(
                      'cursor-pointer transition-all rounded-md px-1',
                      isCurrent && 'ring-2 ring-primary',
                      isCurrent && isAudioPlaying && 'animate-pulse'
                    )}
                    style={{
                      backgroundColor: isCurrent
                        ? `hsl(var(--primary) / 0.25)`
                        : bg,
                      visibility: fontReady ? 'visible' : 'hidden',
                    }}
                  >
                    {g.words.map((w) => w.code_v2).join(' ')}{' '}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};