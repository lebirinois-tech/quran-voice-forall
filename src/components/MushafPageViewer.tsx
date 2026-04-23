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
  mushafType: MushafType;
  initialPage?: number;
  onPageChange?: (page: number) => void;
}

// Page image sources — multiple fallbacks per type
// jsDelivr CDN of QuranHub/quran-pages-images is the most reliable source
const padPage3 = (n: number) => n.toString().padStart(3, '0');

const getPageUrls = (page: number, mushafType: MushafType): string[] => {
  const padded = padPage3(page);
  switch (mushafType) {
    case 'hafs':
      return [
        `https://cdn.jsdelivr.net/gh/QuranHub/quran-pages-images@main/kfgqpc/hafs/${page}.jpg`,
        `https://raw.githubusercontent.com/QuranHub/quran-pages-images/main/kfgqpc/hafs/${page}.jpg`,
        `https://easyquran.com/wp-content/uploads/2022/09/${page}-scaled.jpg`,
      ];
    case 'warsh-tajweed':
      return [
        `https://cdn.jsdelivr.net/gh/QuranHub/quran-pages-images@main/kfgqpc/warsh-tajweed/${page}.jpg`,
        `https://raw.githubusercontent.com/QuranHub/quran-pages-images/main/kfgqpc/warsh-tajweed/${page}.jpg`,
        `https://easyquran.com/wp-content/uploads/2022/10/${page}-scaled.jpg`,
      ];
    case 'qalun':
      return [
        `https://cdn.jsdelivr.net/gh/QuranHub/quran-pages-images@main/kfgqpc/qalun/${page}.jpg`,
        `https://raw.githubusercontent.com/QuranHub/quran-pages-images/main/kfgqpc/qalun/${page}.jpg`,
        // Fallback to Warsh-Tajweed (same Nafi' base reading)
        `https://cdn.jsdelivr.net/gh/QuranHub/quran-pages-images@main/kfgqpc/warsh-tajweed/${page}.jpg`,
        `https://easyquran.com/wp-content/uploads/2022/10/${page}-scaled.jpg`,
      ];
    case 'warsh':
    default:
      return [
        `https://cdn.jsdelivr.net/gh/QuranHub/quran-pages-images@main/kfgqpc/warsh/${page}.jpg`,
        `https://raw.githubusercontent.com/QuranHub/quran-pages-images/main/kfgqpc/warsh/${page}.jpg`,
      ];
  }
};

// Page audio from everyayah.com
// Page audio sources
const getPageAudioUrl = (page: number, type: MushafType): string => {
  const paddedPage = page.toString().padStart(3, '0');
  // Alafasy 128kbps page MP3s (Hafs) - used for hafs, warsh, warsh-tajweed
  return `https://everyayah.com/data/Alafasy_128kbps/PageMp3s/Page${paddedPage}.mp3`;
};

// Qalun surah audio from mp3quran.net (Al-Deban, Qaloon recitation)
const getQalunSurahAudioUrl = (surahNumber: number): string => {
  const paddedSurah = surahNumber.toString().padStart(3, '0');
  return `https://server16.mp3quran.net/deban/Rewayat-Qalon-A-n-Nafi/${paddedSurah}.mp3`;
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
  mushafType,
  initialPage,
  onPageChange,
}: MushafPageViewerProps) => {
  const surah = surahs.find(s => s.number === surahNumber);
  const { start: surahStartPage, end: surahEndPage } = useMemo(
    () => getSurahPages(surahNumber),
    [surahNumber]
  );
  
  const [currentPage, setCurrentPage] = useState(
    initialPage && initialPage >= surahStartPage && initialPage <= surahEndPage
      ? initialPage
      : surahStartPage
  );
  const [isLoading, setIsLoading] = useState(true);

  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState('');
  const [imageSourceIndex, setImageSourceIndex] = useState(0);
  // Use a ref to track manual navigation - survives re-renders without triggering effects
  const hasManuallyNavigatedRef = useRef(
    !!(initialPage && initialPage >= surahStartPage && initialPage <= surahEndPage)
  );
  const prevSurahNumberRef = useRef(surahNumber);
  
  // Page audio state
  const [isPageAudioPlaying, setIsPageAudioPlaying] = useState(false);
  const [isPageAudioLoading, setIsPageAudioLoading] = useState(false);
  const pageAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize page audio element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    pageAudioRef.current = audio;
    
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Only reset page when the surah actually changes
  useEffect(() => {
    if (prevSurahNumberRef.current !== surahNumber) {
      // Surah changed - reset to initialPage or start page
      prevSurahNumberRef.current = surahNumber;
      hasManuallyNavigatedRef.current = false;
      if (initialPage && initialPage >= surahStartPage && initialPage <= surahEndPage) {
        setCurrentPage(initialPage);
        hasManuallyNavigatedRef.current = true;
      } else {
        setCurrentPage(surahStartPage);
      }
    } else if (initialPage && initialPage >= surahStartPage && initialPage <= surahEndPage && !hasManuallyNavigatedRef.current) {
      // Same surah but initialPage provided and no manual navigation yet
      setCurrentPage(initialPage);
      hasManuallyNavigatedRef.current = true;
    }
    // If user has manually navigated, never reset the page
  }, [surahNumber, surahStartPage, surahEndPage, initialPage]);

  // Report current page to parent whenever it changes
  useEffect(() => {
    onPageChange?.(currentPage);
  }, [currentPage, onPageChange]);

  useEffect(() => {
    setIsLoading(true);
    setImageError(false);
    setImageSourceIndex(0);
    setImageSrc(getPageUrls(currentPage, mushafType)[0] ?? '');
  }, [currentPage, mushafType]);

  const playPageAudio = useCallback(async (page: number) => {
    setIsPageAudioLoading(true);
    try {
      // Stop and discard old audio element to avoid corrupted state
      if (pageAudioRef.current) {
        pageAudioRef.current.pause();
        pageAudioRef.current.src = '';
      }

      // Create a fresh audio element
      const newAudio = new Audio();
      newAudio.preload = 'auto';
      
      // Attach event listeners to the new element
      newAudio.addEventListener('ended', () => {
        setIsPageAudioPlaying(false);
        if (mushafType === 'qalun') {
          toast.success('Fin de la récitation Qalun');
        } else if (page < 604) {
          const nextPage = page + 1;
          setCurrentPage(nextPage);
          hasManuallyNavigatedRef.current = true;
          onPageChange?.(nextPage);
          setTimeout(() => playPageAudio(nextPage), 500);
        } else {
          toast.success('Fin de la lecture par page');
        }
      });
      newAudio.addEventListener('error', () => {
        if (newAudio.src && newAudio.src !== '' && newAudio.src !== window.location.href) {
          setIsPageAudioLoading(false);
          setIsPageAudioPlaying(false);
          toast.error('Audio de la page non disponible');
        }
      });

      pageAudioRef.current = newAudio;

      if (mushafType === 'qalun') {
        newAudio.src = getQalunSurahAudioUrl(surahNumber);
      } else {
        newAudio.src = getPageAudioUrl(page, mushafType);
      }
      await newAudio.play();
      setIsPageAudioPlaying(true);
    } catch (err) {
      console.error('Page audio error:', err);
      toast.error('Impossible de charger l\'audio');
    } finally {
      setIsPageAudioLoading(false);
    }
  }, [mushafType, surahNumber, onPageChange]);

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
      hasManuallyNavigatedRef.current = true;
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      onPageChange?.(newPage);
      // If audio is playing, switch to new page audio
      if (isPageAudioPlaying) playPageAudio(newPage);
    }
  };

  const handleNextPage = () => {
    if (currentPage < 604) {
      hasManuallyNavigatedRef.current = true;
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      onPageChange?.(newPage);
      if (isPageAudioPlaying) playPageAudio(newPage);
    }
  };

  const handleImageLoad = () => { setIsLoading(false); setImageError(false); };
  const handleImageError = () => {
    const sources = getPageUrls(currentPage, mushafType);
    const nextIndex = imageSourceIndex + 1;

    if (nextIndex < sources.length) {
      setImageSourceIndex(nextIndex);
      setImageSrc(sources[nextIndex]);
      setIsLoading(true);
      return;
    }

    setIsLoading(false);
    setImageError(true);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Page Info Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="text-sm text-muted-foreground">
          {mushafType === 'hafs' && '📖 Mushaf Hafs Tajweed'}
          {mushafType === 'warsh-tajweed' && '🎨 Mushaf Warsh Tajweed'}
          {mushafType === 'warsh' && '📜 Mushaf Warsh'}
          {mushafType === 'qalun' && '📗 Mushaf Qalun (Nafi\')'}
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
            <span className="text-xs">{mushafType === 'qalun' ? 'Sourate' : 'Page'}</span>
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
                src={imageSrc}
                alt={`Page ${currentPage} - ${mushafType}`}
                className={cn(
                  "w-full h-full object-contain transition-opacity duration-300",
                  isLoading ? "opacity-0" : "opacity-100"
                )}
                referrerPolicy="no-referrer"
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
          {mushafType === 'qalun' && '📗 Qalun - Pages Tajweed de la lecture de Nafi\' (Warsh Tajweed)'}
        </p>
      </div>
    </div>
  );
};
