import { useEffect, useState, useRef, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Word {
  id: number;
  position: number;
  text_uthmani?: string;
  code_v2: string;
  line_number: number;
  page_number: number;
  char_type_name: string; // 'word' | 'end' | 'pause' | etc.
}

interface Verse {
  id: number;
  verse_key: string; // "2:255"
  verse_number: number;
  words: Word[];
}

interface PageData {
  verses: Verse[];
}

interface MushafPageRendererProps {
  page: number;
  surahNumber: number;
  currentVerse?: number;
  isAudioPlaying?: boolean;
  onVerseClick?: (verseNumber: number) => void;
}

const PAGE_CACHE_PREFIX = 'qpc-page-data-';
const loadedFonts = new Set<number>();

const FONT_CDNS = (page: number) => [
  `https://cdn.jsdelivr.net/gh/quran/quran.com-frontend-next@production/public/fonts/quran/hafs/v2/woff2/p${page}.woff2`,
  `https://raw.githubusercontent.com/quran/quran.com-frontend-next/production/public/fonts/quran/hafs/v2/woff2/p${page}.woff2`,
];

async function loadPageFont(page: number): Promise<void> {
  if (loadedFonts.has(page)) return;
  const family = `QPCHafs${page}`;
  for (const url of FONT_CDNS(page)) {
    try {
      const face = new FontFace(family, `url(${url}) format('woff2')`);
      await face.load();
      (document as any).fonts.add(face);
      loadedFonts.add(page);
      return;
    } catch {
      // try next
    }
  }
  throw new Error(`Font for page ${page} unavailable`);
}

async function fetchPageData(page: number): Promise<PageData> {
  const cacheKey = PAGE_CACHE_PREFIX + page;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {}

  const url = `https://api.quran.com/api/v4/verses/by_page/${page}?words=true&word_fields=code_v2,line_number,page_number,position,text_uthmani,char_type_name&per_page=300`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API ${res.status}`);
  const json = await res.json();
  const data: PageData = { verses: json.verses };
  try {
    localStorage.setItem(cacheKey, JSON.stringify(data));
  } catch {}
  return data;
}

export const MushafPageRenderer = ({
  page,
  surahNumber,
  currentVerse,
  isAudioPlaying,
  onVerseClick,
}: MushafPageRendererProps) => {
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentVerseRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    (async () => {
      try {
        const [pageData] = await Promise.all([
          fetchPageData(page),
          loadPageFont(page),
        ]);
        if (!cancelled) {
          setData(pageData);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Erreur de chargement');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [page]);

  // Auto-scroll to current verse
  useEffect(() => {
    if (currentVerseRef.current) {
      currentVerseRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentVerse, data]);

  // Group all words from all verses by line_number
  const linesMap = useMemo(() => {
    const map = new Map<number, { verseNumber: number; verseKey: string; word: Word }[]>();
    if (!data) return map;
    for (const verse of data.verses) {
      for (const word of verse.words) {
        const arr = map.get(word.line_number) || [];
        arr.push({ verseNumber: verse.verse_number, verseKey: verse.verse_key, word });
        map.set(word.line_number, arr);
      }
    }
    // Sort words within each line by position
    for (const arr of map.values()) {
      arr.sort((a, b) => a.word.position - b.word.position);
    }
    return map;
  }, [data]);

  const lineNumbers = useMemo(
    () => Array.from(linesMap.keys()).sort((a, b) => a - b),
    [linesMap]
  );

  const fontFamily = `QPCHafs${page}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 bg-card rounded-xl border border-border min-h-[500px]">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <span className="ml-3 text-sm text-muted-foreground">Chargement page {page}…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-card rounded-xl border border-border min-h-[500px]">
        <p className="text-sm text-destructive mb-2">Impossible de charger la page</p>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border shadow-lg p-6 sm:p-10 min-h-[500px]",
        "bg-[hsl(48_30%_97%)] dark:bg-[hsl(48_15%_12%)]",
        page % 2 === 0 ? "" : "bg-opacity-80",
        isAudioPlaying && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
      dir="rtl"
    >
      <div className="flex flex-col gap-1">
        {lineNumbers.map((lineNum) => {
          const lineWords = linesMap.get(lineNum) || [];
          // Group consecutive words by verse for highlighting
          const groups: { verseNumber: number; words: Word[] }[] = [];
          for (const { verseNumber, word } of lineWords) {
            const last = groups[groups.length - 1];
            if (last && last.verseNumber === verseNumber) {
              last.words.push(word);
            } else {
              groups.push({ verseNumber, words: [word] });
            }
          }

          return (
            <div
              key={lineNum}
              className="flex justify-between items-center w-full leading-[2.4] sm:leading-[2.6]"
              style={{ fontFamily, fontSize: 'clamp(1.5rem, 5vw, 2.25rem)' }}
            >
              {groups.map((g, i) => {
                const isCurrent = currentVerse === g.verseNumber;
                return (
                  <span
                    key={`${lineNum}-${i}`}
                    ref={isCurrent && i === 0 ? currentVerseRef : undefined}
                    role="button"
                    tabIndex={0}
                    onClick={() => onVerseClick?.(g.verseNumber)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') onVerseClick?.(g.verseNumber);
                    }}
                    className={cn(
                      "cursor-pointer transition-all rounded px-0.5",
                      "text-foreground",
                      isCurrent && isAudioPlaying && "bg-primary/25 ring-2 ring-primary text-primary animate-pulse",
                      isCurrent && !isAudioPlaying && "bg-primary/15 ring-1 ring-primary/60",
                      !isCurrent && "hover:bg-primary/10"
                    )}
                  >
                    {g.words.map((w) => w.code_v2).join('')}
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
