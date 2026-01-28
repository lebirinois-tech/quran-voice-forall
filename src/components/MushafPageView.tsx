import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Loader2, ZoomIn, ZoomOut, RotateCcw, Volume2, BookOpen } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MushafPageViewProps {
  initialPage: number;
  onPageChange?: (page: number) => void;
  currentVerse?: number;
  currentVerseText?: string;
  isPlaying?: boolean;
  surahName?: string;
  surahNumber?: number;
}

// EasyQuran Tajweed Mushaf CDN (high-res colored Tajweed)
const getMushafPageUrl = (page: number): string => {
  return `https://easyquran.com/wp-content/uploads/2022/09/${page}-scaled.jpg`;
};

export const MushafPageView = ({ 
  initialPage, 
  onPageChange,
  currentVerse,
  currentVerseText,
  isPlaying,
  surahName,
  surahNumber
}: MushafPageViewProps) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageInput, setPageInput] = useState(initialPage.toString());
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setCurrentPage(initialPage);
    setPageInput(initialPage.toString());
  }, [initialPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= 604) {
      setCurrentPage(newPage);
      setPageInput(newPage.toString());
      setIsLoading(true);
      setHasError(false);
      onPageChange?.(newPage);
    }
  };

  const handleGoToPage = () => {
    const num = parseInt(pageInput);
    if (num >= 1 && num <= 604) {
      handlePageChange(num);
    } else {
      toast.error('Numéro de page invalide (1-604)');
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 2.5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Current Verse Highlight Panel - Shows Arabic text to find on page */}
      {isPlaying && currentVerse && (
        <div className="sticky top-20 z-20 animate-fade-in w-full max-w-2xl">
          <div className="bg-gradient-to-r from-primary via-primary to-primary/90 text-primary-foreground rounded-xl shadow-xl border-2 border-primary-foreground/20 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-2 bg-primary-foreground/10">
              <div className="relative">
                <Volume2 className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full animate-ping" />
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full" />
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 opacity-80" />
                <span className="font-semibold">
                  {surahName || `Sourate ${surahNumber}`} • Verset {currentVerse}
                </span>
              </div>
              <span className="ml-auto text-xs opacity-80 bg-primary-foreground/20 px-2 py-0.5 rounded">
                Page {initialPage}
              </span>
            </div>
            
            {/* Arabic Text to Follow */}
            {currentVerseText && (
              <div className="px-4 py-3 bg-ivory/95 dark:bg-card/95">
                <p className="arabic-text text-foreground text-xl md:text-2xl leading-loose text-center font-amiri" dir="rtl">
                  <span className="text-red-600 dark:text-red-400">{currentVerseText}</span>
                  <span className="inline-flex items-center justify-center w-8 h-8 mx-2 text-sm bg-primary text-primary-foreground rounded-full font-cairo">
                    {currentVerse}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Repérez ce texte sur la page Mushaf ci-dessous
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Controls */}
      <div className="flex items-center gap-3 flex-wrap justify-center bg-card border border-border rounded-xl p-3 shadow-soft">
        {/* Previous Page */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Page précédente"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>

        {/* Page Input */}
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="1"
            max="604"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGoToPage()}
            className="w-20 h-9 text-center"
            aria-label="Numéro de page"
          />
          <span className="text-muted-foreground text-sm">/ 604</span>
          <Button onClick={handleGoToPage} size="sm">
            Aller
          </Button>
        </div>

        {/* Next Page */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= 604}
          aria-label="Page suivante"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomOut}
          disabled={zoom <= 0.5}
          aria-label="Zoom arrière"
          className="h-8 w-8"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomIn}
          disabled={zoom >= 2.5}
          aria-label="Zoom avant"
          className="h-8 w-8"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleResetZoom}
          aria-label="Réinitialiser le zoom"
          className="h-8 w-8"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Page Display */}
      <div 
        className="relative w-full max-w-2xl overflow-auto bg-card rounded-xl border border-border shadow-lg"
        style={{ minHeight: '500px' }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-muted-foreground">Chargement de la page {currentPage}...</p>
            </div>
          </div>
        )}

        {hasError ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <p className="text-destructive text-center mb-4">
              Impossible de charger la page {currentPage}
            </p>
            <Button onClick={() => handlePageChange(currentPage)}>
              Réessayer
            </Button>
          </div>
        ) : (
          <div 
            className={cn(
              "flex justify-center p-4 transition-transform duration-300",
              isLoading && "opacity-0"
            )}
            style={{ 
              transform: `scale(${zoom})`,
              transformOrigin: 'top center'
            }}
          >
            <img
              src={getMushafPageUrl(currentPage)}
              alt={`Page ${currentPage} du Mushaf Tajweed`}
              className="max-w-full h-auto rounded-lg shadow-md"
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading="eager"
            />
          </div>
        )}
      </div>

      {/* Page Info */}
      <p className="text-sm text-muted-foreground text-center">
        Page {currentPage} sur 604 • Mushaf Tajweed Coloré
      </p>
    </div>
  );
};
