import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { SuperMemoGrade } from 'supermemo';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { dueHifzEntries, mergeHifzEntries, reviewHifzEntry, type HifzEntry } from '@/lib/hifzPlan';

const entrySchema = z.object({
  id: z.string().uuid(), label: z.string(), unit: z.enum(['surah', 'pages', 'juz', 'quarter']),
  ranges: z.array(z.object({ surah: z.number().int().min(1).max(114), from: z.number().int().min(1), to: z.number().int().min(1) })).min(1),
  status: z.enum(['learning', 'memorized']), due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  schedule: z.object({ interval: z.number().nonnegative(), repetition: z.number().nonnegative(), efactor: z.number().positive() }),
  history: z.array(z.object({ date: z.string(), grade: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]), score: z.number().min(0).max(100).optional() })),
  updatedAt: z.string().datetime(), deleted: z.boolean().optional(),
});
const parseEntries = (values: unknown): HifzEntry[] => Array.isArray(values) ? values.flatMap(value => {
  const parsed = entrySchema.safeParse(value);
  return parsed.success ? [parsed.data as HifzEntry] : [];
}) : [];
const keyFor = (owner: string) => `quran-hifz-plan-v1:${owner}`;
const readEntries = (owner: string) => {
  try { return parseEntries(JSON.parse(localStorage.getItem(keyFor(owner)) ?? '[]')); } catch { return []; }
};
interface HifzPlanContextValue {
  entries: HifzEntry[]; due: HifzEntry[]; ready: boolean; syncStatus: string; storageError: string;
  save: (entry: HifzEntry) => boolean;
  review: (id: string, grade: SuperMemoGrade, score?: number) => boolean;
  remove: (id: string) => void;
}
const Context = createContext<HifzPlanContextValue | null>(null);

export function HifzPlanProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const owner = user?.id ?? 'guest';
  const [state, setState] = useState({ owner: 'guest', entries: readEntries('guest') });
  const [syncStatus, setSyncStatus] = useState('Conservé sur cet appareil');
  const [storageError, setStorageError] = useState('');
  const [clock, setClock] = useState(0);
  const currentOwner = useRef(owner);
  currentOwner.current = owner;
  const syncRef = useRef<() => Promise<void>>(async () => {});
  const syncTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (loading) return;
    setState({ owner, entries: readEntries(owner) });
    setSyncStatus(user ? 'Synchronisation en attente' : 'Conservé sur cet appareil');
    let disposed = false;
    let running = false;
    const sync = async () => {
      if (!user || !navigator.onLine || running || disposed) return;
      running = true;
      try {
        const { data, error } = await supabase.from('hifz_plan_entries').select('payload').eq('user_id', user.id);
        if (error) throw error;
        if (disposed) return;
        const merged = mergeHifzEntries(readEntries(owner), parseEntries(data.map(row => row.payload)));
        localStorage.setItem(keyFor(owner), JSON.stringify(merged));
        setState({ owner, entries: merged });
        if (merged.length) {
          const { error: writeError } = await supabase.from('hifz_plan_entries').upsert(merged.map(entry => ({
            user_id: user.id, id: entry.id, payload: entry as unknown as Json, updated_at: entry.updatedAt,
          })), { onConflict: 'user_id,id' });
          if (writeError) throw writeError;
        }
        if (!disposed) setSyncStatus('Synchronisé avec votre compte');
      } catch {
        if (!disposed) setSyncStatus('Conservé ici · synchronisation en attente');
      } finally { running = false; }
    };
    syncRef.current = sync;
    void sync();
    const onForeground = () => { if (document.visibilityState === 'visible') { setClock(v => v + 1); void sync(); } };
    const interval = setInterval(() => { setClock(v => v + 1); void sync(); }, 60000);
    const onStorage = (e: StorageEvent) => { if (e.key === keyFor(owner)) setState({ owner, entries: readEntries(owner) }); };
    window.addEventListener('online', sync);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onForeground);
    return () => {
      disposed = true; clearInterval(interval); clearTimeout(syncTimer.current);
      window.removeEventListener('online', sync); window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onForeground);
    };
  }, [owner, loading, user?.id]);

  const persist = (entry: HifzEntry) => {
    if (loading || currentOwner.current !== state.owner) return false;
    try {
      const entries = mergeHifzEntries([entry], readEntries(owner));
      localStorage.setItem(keyFor(owner), JSON.stringify(entries));
      setState({ owner, entries }); setStorageError('');
      if (user) setSyncStatus('Synchronisation en attente');
      clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => void syncRef.current(), 300);
      return true;
    } catch { setStorageError('La mémoire de cet appareil est pleine. La modification n’a pas été enregistrée.'); return false; }
  };
  const entries = state.owner === owner ? state.entries.filter(e => !e.deleted) : [];
  const review = (id: string, grade: SuperMemoGrade, score?: number) => {
    const entry = entries.find(e => e.id === id);
    return entry ? persist(reviewHifzEntry(entry, grade, score)) : false;
  };
  void clock;
  return <Context.Provider value={{ entries, due: dueHifzEntries(entries), ready: !loading && state.owner === owner,
    syncStatus, storageError, save: persist, review,
    remove: id => { const entry = entries.find(e => e.id === id); if (entry) persist({ ...entry, deleted: true, updatedAt: new Date().toISOString() }); },
  }}>{children}</Context.Provider>;
}
export function useHifzPlan() {
  const value = useContext(Context);
  if (!value) throw new Error('HifzPlanProvider missing');
  return value;
}