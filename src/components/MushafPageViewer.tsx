import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { AspectRatio } from './ui/aspect-ratio';
import { cn } from '@/lib/utils';
import { getVersePage, surahs } from '@/data/surahs';

type MushafType = 'hafs' | 'warsh';

interface MushafPageViewerProps {
  surahNumber: number;
  totalVerses: number;
  currentVerse: number;
  mushafType: MushafType;
  onPageChange?: (page: number) => void;
}

// Page image sources
const getHafsPageUrl = (page: number): string => {
  // EasyQuran Hafs Tajweed colored pages
  return `https://easyquran.com/wp-content/uploads/2022/09/${page}-scaled.jpg`;
};

const getWarshPageUrl = (page: number): string => {
  // KFGQPC Warsh pages (authentic Warsh script)
  const paddedPage = String(page).padStart(3, '0');
  return `https://www.mp3quran.net/api/quran_pages_warsh/${paddedPage}.png`;
};

// Get surah start and end pages
const getSurahPages = (surahNumber: number): { start: number; end: number } => {
  const surah = surahs.find(s => s.number === surahNumber);
  if (!surah) return { start: 1, end: 604 };
  
  // Find start page of this surah
  const startPage = getVersePage(surahNumber, 1, surah.versesCount);
  
  // Find end page by getting the page of the last verse
  const endPage = getVersePage(surahNumber, surah.versesCount, surah.versesCount);
  
  return { start: startPage, end: endPage };
};

export const MushafPageViewer = ({
  surahNumber,
  totalVerses,
  currentVerse,
  mushafType,
  onPageChange,
}: MushafPageViewerProps) => {
  const surah = surahs.find(s => s.number === surahNumber);
  const { start: surahStartPage, end: surahEndPage } = useMemo(
    () => getSurahPages(surahNumber),
    [surahNumber]
  );
  
  // Calculate initial page based on current verse
  const initialPage = useMemo(() => {
    if (currentVerse > 0 && surah) {
      return getVersePage(surahNumber, currentVerse, surah.versesCount);
    }
    return surahStartPage;
  }, [surahNumber, currentVerse, surah, surahStartPage]);
  
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Update page when verse changes
  useEffect(() => {
    if (currentVerse > 0 && surah) {
      const versePage = getVersePage(surahNumber, currentVerse, surah.versesCount);
      if (versePage !== currentPage) {
        setCurrentPage(versePage);
      }
    }
  }, [currentVerse, surahNumber, surah, currentPage]);

  // Reset loading state when page changes
  useEffect(() => {
    setIsLoading(true);
    setImageError(false);
  }, [currentPage, mushafType]);

  const getPageUrl = (page: number): string => {
    return mushafType === 'hafs' ? getHafsPageUrl(page) : getWarshPageUrl(page);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      onPageChange?.(newPage);
    }
  };

  const handleNextPage = () => {
    if (currentPage < 604) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      onPageChange?.(newPage);
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setImageError(true);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Page Info Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="text-sm text-muted-foreground">
          {mushafType === 'hafs' ? '📖 Mushaf Hafs Tajweed' : '📜 Mushaf Warsh'}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            Page {currentPage} / 604
          </span>
        </div>
      </div>

      {/* Page Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePreviousPage}
          disabled={currentPage <= 1}
          className="shrink-0"
          aria-label="Page précédente"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex-1 relative">
          <AspectRatio ratio={3 / 4} className="bg-card rounded-xl overflow-hidden border border-border shadow-lg">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            )}
            
            {imageError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50 text-muted-foreground p-4">
                <p className="text-center mb-2">Impossible de charger la page</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsLoading(true);
                    setImageError(false);
                  }}
                >
                  Réessayer
                </Button>
              </div>
            ) : (
              <img
                src={getPageUrl(currentPage)}
                alt={`Page ${currentPage} - ${mushafType === 'hafs' ? 'Hafs Tajweed' : 'Warsh'}`}
                className={cn(
                  "w-full h-full object-contain transition-opacity duration-300",
                  isLoading ? "opacity-0" : "opacity-100"
                )}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            )}
          </AspectRatio>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={handleNextPage}
          disabled={currentPage >= 604}
          className="shrink-0"
          aria-label="Page suivante"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Quick page navigation */}
      <div className="flex items-center justify-center gap-2 mt-4">
        <span className="text-xs text-muted-foreground">
          Sourate {surah?.name} : Pages {surahStartPage} - {surahEndPage}
        </span>
      </div>

      {/* Mushaf type indicator */}
      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-center text-muted-foreground">
          {mushafType === 'hafs' 
            ? '🎨 Hafs avec Tajweed coloré (lecture standard)'
            : '📜 Warsh - Script authentique maghrébin (sans couleurs Tajweed)'}
        </p>
      </div>
    </div>
  );
};
