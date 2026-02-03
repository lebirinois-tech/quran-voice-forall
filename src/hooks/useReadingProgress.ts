import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ReadingProgress {
  surah_number: number;
  verse_number: number;
  last_read_at: string;
}

export const useReadingProgress = () => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<ReadingProgress[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProgress = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reading_progress')
        .select('surah_number, verse_number, last_read_at')
        .eq('user_id', user.id)
        .order('last_read_at', { ascending: false });

      if (error) throw error;
      setProgress(data || []);
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const saveProgress = useCallback(async (surahNumber: number, verseNumber: number) => {
    if (!user) return { error: new Error('Non authentifié') };

    try {
      const { error } = await supabase
        .from('reading_progress')
        .upsert({
          user_id: user.id,
          surah_number: surahNumber,
          verse_number: verseNumber,
          last_read_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,surah_number'
        });

      if (error) throw error;
      
      // Refresh progress
      await fetchProgress();
      return { error: null };
    } catch (error) {
      console.error('Error saving progress:', error);
      return { error };
    }
  }, [user, fetchProgress]);

  const getLastRead = useCallback(() => {
    if (progress.length === 0) return null;
    return progress[0];
  }, [progress]);

  const getSurahProgress = useCallback((surahNumber: number) => {
    return progress.find(p => p.surah_number === surahNumber);
  }, [progress]);

  return {
    progress,
    loading,
    fetchProgress,
    saveProgress,
    getLastRead,
    getSurahProgress
  };
};
