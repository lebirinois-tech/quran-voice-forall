import { useEffect, useState } from 'react';
import { Download, CheckCircle2 } from 'lucide-react';
import {
  AUTO_OFFLINE_EVENT,
  isAutoOfflineDone,
  type AutoOfflineProgress,
} from '@/lib/autoOfflineRiwayat';

const STEP_LABELS: Record<AutoOfflineProgress['step'], string> = {
  hafs: 'Hafs / حفص',
  warsh: 'Warsh / ورش',
  qalun: 'Qalun / قالون',
  done: 'Terminé',
};

/** Indicateur discret du téléchargement automatique des trois riwayat. */
export const OfflineRiwayatStatus = () => {
  const [progress, setProgress] = useState<AutoOfflineProgress | null>(null);
  const [hidden, setHidden] = useState(isAutoOfflineDone());

  useEffect(() => {
    const onProgress = (e: Event) => {
      const detail = (e as CustomEvent<AutoOfflineProgress>).detail;
      setProgress(detail);
      if (detail.step === 'done') setTimeout(() => setHidden(true), 4000);
    };
    window.addEventListener(AUTO_OFFLINE_EVENT, onProgress);
    return () => window.removeEventListener(AUTO_OFFLINE_EVENT, onProgress);
  }, []);

  if (hidden || !progress) return null;

  const isDone = progress.step === 'done';

  return (
    <div
      className="max-w-md mx-auto mb-4 rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground flex items-center gap-2"
      aria-live="polite"
    >
      {isDone ? (
        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
      ) : (
        <Download className="h-4 w-4 text-primary shrink-0 animate-pulse" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-foreground font-medium truncate">
          {isDone
            ? 'Les trois riwayat sont disponibles hors connexion'
            : `Téléchargement hors ligne — ${STEP_LABELS[progress.step]}`}
        </p>
        {!isDone && (
          <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        )}
      </div>
      {!isDone && <span className="tabular-nums">{progress.percent}%</span>}
    </div>
  );
};

export default OfflineRiwayatStatus;
