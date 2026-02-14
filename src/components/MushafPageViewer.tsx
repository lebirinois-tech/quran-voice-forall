import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Play, Pause } from 'lucide-react';
import { Button } from './ui/button';
import { AspectRatio } from './ui/aspect-ratio';
import { cn } from '@/lib/utils';
import { getVersePage, surahs } from '@/data/surahs';
import { toast } from 'sonner';

type MushafType = 'hafs' | 'warsh' | 'warsh-tajweed' | 'qalun';

interface MushafPageViewerProps {
  surahNumber: number;
  totalVerses: number;
  currentVerse: number;
  mushafType: MushafType;
  onPageChange?: (page: number) => void;
}

// Page image sources
const getHafsPageUrl = (page: number): string => {
  return `https://easyquran.com/wp-content/uploads/2022/09/${page}-scaled.jpg`;
};

const getWarshPageUrl = (page: number): string => {
  return `https://raw.githubusercontent.com/QuranHub/quran-pages-images/main/kfgqpc/warsh/${page}.jpg`;
};

const getWarshTajweedPageUrl = (page: number): string => {
  return `https://easyquran.com/wp-content/uploads/2022/10/${page}-scaled.jpg`;
};

const getQalunPageUrl = (page: number): string => {
  // EasyQuran Qalun Tajweed colored pages (November 2022 folder)
  return `https://easyquran.com/wp-content/uploads/2022/11/${page}-scaled.jpg`;
};

// Page audio from everyayah.com
const getPageAudioUrl = (page: number): string => {
  const paddedPage = page.toString().padStart(3, '0');
  // Alafasy 128kbps page MP3s
  return `https://everyayah.com/data/Alafasy_128kbps/PageMp3s/Page${paddedPage}.mp3`;
};

// Get surah start and end pages
const getSurahPages = (surahNumber: number): { start: number; end: number } => {
  const surah = surahs.find(s => s.number === surahNumber);
  if (!surah) return { start: 1, end: 604 };
  const startPage = getVersePage(surahNumber, 1, surah.versesCount);
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
  
  const [currentPage, setCurrentPage] = useState(surahStartPage);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [isManualNavigation, setIsManualNavigation] = useState(false);
  
  // Page audio state
  const [isPageAudioPlaying, setIsPageAudioPlaying] = useState(false);
  const [isPageAudioLoading, setIsPageAudioLoading] = useState(false);
  const pageAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize page audio element
  useEffect(() => {
    pageAudioRef.current = new Audio();
    pageAudioRef.current.preload = 'auto';
    
    const audio = pageAudioRef.current;
    audio.addEventListener('ended', () => {
      setIsPageAudioPlaying(false);
      // Auto-play next page
      if (currentPage < 604) {
        const nextPage = currentPage + 1;
        setCurrentPage(nextPage);
        setIsManualNavigation(true);
        onPageChange?.(nextPage);
      }
    });
    audio.addEventListener('error', () => {
      setIsPageAudioLoading(false);
      setIsPageAudioPlaying(false);
      toast.error('Audio de la page non disponible');
    });
    
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Update audio ended handler when currentPage changes
  useEffect(() => {
    const audio = pageAudioRef.current;
    if (!audio) return;
    
    const handleEnded = () => {
      setIsPageAudioPlaying(false);
      if (currentPage < 604) {
        const nextPage = currentPage + 1;
        setCurrentPage(nextPage);
        setIsManualNavigation(true);
        onPageChange?.(nextPage);
        // Auto-play next page after short delay
        setTimeout(() => playPageAudio(nextPage), 500);
      } else {
        toast.success('Fin de la lecture par page');
      }
    };
    
    // Remove old and add new
    audio.removeEventListener('ended', handleEnded);
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [currentPage, onPageChange]);

  useEffect(() => {
    setCurrentPage(surahStartPage);
    setIsManualNavigation(false);
  }, [surahNumber, surahStartPage]);

  useEffect(() => {
    if (!isManualNavigation && currentVerse > 0 && surah) {
      const versePage = getVersePage(surahNumber, currentVerse, surah.versesCount);
      setCurrentPage(versePage);
    }
  }, [currentVerse, surahNumber, surah, isManualNavigation]);

  useEffect(() => {
    setIsLoading(true);
    setImageError(false);
  }, [currentPage, mushafType]);

  const getPageUrl = (page: number): string => {
    switch (mushafType) {
      case 'hafs': return getHafsPageUrl(page);
      case 'warsh-tajweed': return getWarshTajweedPageUrl(page);
      case 'qalun': return getQalunPageUrl(page);
      case 'warsh':
      default: return getWarshPageUrl(page);
    }
  };

  const playPageAudio = useCallback(async (page: number) => {
    if (!pageAudioRef.current) return;
    setIsPageAudioLoading(true);
    try {
      pageAudioRef.current.src = getPageAudioUrl(page);
      await pageAudioRef.current.play();
      setIsPageAudioPlaying(true);
    } catch (err) {
      console.error('Page audio error:', err);
      toast.error('Impossible de charger l\'audio de la page');
    } finally {
      setIsPageAudioLoading(false);
    }
  }, []);

  const togglePageAudio = useCallback(() => {
    if (!pageAudioRef.current) return;
    if (isPageAudioPlaying) {
      pageAudioRef.current.pause();
      setIsPageAudioPlaying(false);
    } else {
      playPageAudio(currentPage);
    }
  }, [isPageAudioPlaying, currentPage, playPageAudio]);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setIsManualNavigation(true);
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      onPageChange?.(newPage);
      // If audio is playing, switch to new page audio
      if (isPageAudioPlaying) playPageAudio(newPage);
    }
  };

  const handleNextPage = () => {
    if (currentPage < 604) {
      setIsManualNavigation(true);
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      onPageChange?.(newPage);
      if (isPageAudioPlaying) playPageAudio(newPage);
    }
  };

  const handleImageLoad = () => { setIsLoading(false); setImageError(false); };
  const handleImageError = () => { setIsLoading(false); setImageError(true); };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Page Info Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="text-sm text-muted-foreground">
          {mushafType === 'hafs' && '📖 Mushaf Hafs Tajweed'}
          {mushafType === 'warsh-tajweed' && '🎨 Mushaf Warsh Tajweed'}
          {mushafType === 'warsh' && '📜 Mushaf Warsh'}
          {mushafType === 'qalun' && '📗 Mushaf Qalun Tajweed'}
        </div>
        <div className="flex items-center gap-2">
          {/* Page Audio Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={togglePageAudio}
            disabled={isPageAudioLoading}
            className={cn(
              "gap-1.5",
              isPageAudioPlaying && "text-primary border-primary bg-primary/10"
            )}
            aria-label={isPageAudioPlaying ? 'Arrêter l\'audio' : 'Écouter la page'}
          >
            {isPageAudioLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isPageAudioPlaying ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            <span className="text-xs">Page</span>
          </Button>
          <span className="text-sm font-medium text-foreground">
            Page {currentPage} / 604
          </span>
        </div>
      </div>

      {/* Page Navigation */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={handlePreviousPage} disabled={currentPage <= 1} className="shrink-0" aria-label="Page précédente">
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
                <Button variant="outline" size="sm" onClick={() => { setIsLoading(true); setImageError(false); }}>
                  Réessayer
                </Button>
              </div>
            ) : (
              <img
                src={getPageUrl(currentPage)}
                alt={`Page ${currentPage} - ${mushafType}`}
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

        <Button variant="outline" size="icon" onClick={handleNextPage} disabled={currentPage >= 604} className="shrink-0" aria-label="Page suivante">
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
          {mushafType === 'hafs' && '🎨 Hafs avec Tajweed coloré (lecture standard)'}
          {mushafType === 'warsh-tajweed' && '🎨 Warsh avec Tajweed coloré (lecture maghrébine)'}
          {mushafType === 'warsh' && '📜 Warsh - Script authentique maghrébin (sans couleurs Tajweed)'}
          {mushafType === 'qalun' && '📗 Qalun avec Tajweed coloré (lecture de Nafi\')'}
        </p>
      </div>
    </div>
  );
};
