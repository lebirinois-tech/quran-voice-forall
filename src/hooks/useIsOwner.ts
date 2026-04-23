import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Returns true only if the current authenticated user is the app owner.
 * Source of truth is the database function `public.is_app_owner()`.
 */
export const useIsOwner = () => {
  const { user, loading: authLoading } = useAuth();
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!user) {
        if (!cancelled) {
          setIsOwner(false);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      const { data, error } = await supabase.rpc('is_app_owner');
      if (cancelled) return;
      setIsOwner(!error && data === true);
      setLoading(false);
    };

    if (!authLoading) check();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { isOwner, loading: loading || authLoading };
};