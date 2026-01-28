import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const TOTAL_PAGES = 604;
const BATCH_SIZE = 10;
const STORAGE_KEY = 'mushaf-download-status';

interface DownloadStatus {
  isComplete: boolean;
  downloadedPages: number[];
  lastUpdated: number;
}

export const useMushafDownload = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadedCount, setDownloadedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  // Check local storage and server status on mount
  useEffect(() => {
    checkDownloadStatus();
  }, []);

  const checkDownloadStatus = async () => {
    try {
      // Check local storage first
      const storedStatus = localStorage.getItem(STORAGE_KEY);
      if (storedStatus) {
        const status: DownloadStatus = JSON.parse(storedStatus);
        // If completed within last 24 hours, trust local storage
        if (status.isComplete && Date.now() - status.lastUpdated < 24 * 60 * 60 * 1000) {
          setIsComplete(true);
          setDownloadedCount(TOTAL_PAGES);
          setProgress(100);
          return;
        }
      }

      // Check server status
      const { data, error } = await supabase.functions.invoke('download-mushaf-pages', {
        body: { action: 'check-status' }
      });

      if (error) throw error;

      const downloadedPages = data.downloadedPages || [];
      setDownloadedCount(downloadedPages.length);
      setProgress((downloadedPages.length / TOTAL_PAGES) * 100);
      
      if (downloadedPages.length >= TOTAL_PAGES) {
        setIsComplete(true);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          isComplete: true,
          downloadedPages,
          lastUpdated: Date.now()
        }));
      }
    } catch (err) {
      console.error('Error checking download status:', err);
      // Don't block the app if check fails
    }
  };

  const startDownload = useCallback(async () => {
    if (isDownloading) return;

    setIsDownloading(true);
    setError(null);

    try {
      // First check what's already downloaded
      const { data: statusData } = await supabase.functions.invoke('download-mushaf-pages', {
        body: { action: 'check-status' }
      });

      const downloadedSet = new Set(statusData?.downloadedPages || []);
      const pagesToDownload = [];
      
      for (let i = 1; i <= TOTAL_PAGES; i++) {
        if (!downloadedSet.has(i)) {
          pagesToDownload.push(i);
        }
      }

      if (pagesToDownload.length === 0) {
        setIsComplete(true);
        setProgress(100);
        setDownloadedCount(TOTAL_PAGES);
        setIsDownloading(false);
        return;
      }

      // Download pages in batches
      let completed = downloadedSet.size;

      for (let i = 0; i < pagesToDownload.length; i += BATCH_SIZE) {
        const batch = pagesToDownload.slice(i, i + BATCH_SIZE);
        
        // Download batch sequentially to avoid rate limiting
        for (const page of batch) {
          try {
            await supabase.functions.invoke('download-mushaf-pages', {
              body: { action: 'download-page', page }
            });
            completed++;
            setDownloadedCount(completed);
            setProgress((completed / TOTAL_PAGES) * 100);
          } catch (err) {
            console.error(`Error downloading page ${page}:`, err);
            // Continue with next page
          }
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setIsComplete(true);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        isComplete: true,
        downloadedPages: Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1),
        lastUpdated: Date.now()
      }));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du téléchargement');
    } finally {
      setIsDownloading(false);
    }
  }, [isDownloading]);

  const getPageUrl = useCallback((page: number): string => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/mushaf-pages/${page}.jpg`;
  }, []);

  return {
    isDownloading,
    isComplete,
    progress,
    downloadedCount,
    totalPages: TOTAL_PAGES,
    error,
    startDownload,
    getPageUrl,
    checkDownloadStatus
  };
};
