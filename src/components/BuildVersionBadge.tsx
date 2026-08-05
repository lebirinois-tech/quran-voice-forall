import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LOCAL_VERSION, fetchDeployedVersion, formatBuildTime, type VersionInfo } from '@/lib/buildVersion';
import { useUpdateCheck } from '@/components/UpdatePrompt';

export const BuildVersionBadge = ({ className }: { className?: string }) => {
  const [remote, setRemote] = useState<VersionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { checkForUpdate, isChecking } = useUpdateCheck();

  const load = useCallback(async () => {
    setLoading(true);
    setRemote(await fetchDeployedVersion());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unknown = !remote;
  const upToDate = remote && remote.buildId === LOCAL_VERSION.buildId;

  return (
    <div className={cn('mx-auto max-w-md rounded-lg border border-border/60 bg-muted/30 p-3 text-xs', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-foreground">Version chargée / النسخة المحمّلة</span>
        <code className="rounded bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
          {LOCAL_VERSION.buildId}
        </code>
      </div>
      <p className="mt-1 text-left text-muted-foreground">
        Compilée le {formatBuildTime(LOCAL_VERSION.buildTime)}
      </p>

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/50 pt-2">
        <span className="font-medium text-foreground">Dernière version déployée</span>
        <code className="rounded bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
          {loading ? '…' : remote?.buildId ?? 'inconnue'}
        </code>
      </div>
      {remote?.buildTime && (
        <p className="mt-1 text-left text-muted-foreground">
          Déployée le {formatBuildTime(remote.buildTime)}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        {loading ? (
          <span className="text-muted-foreground">Vérification…</span>
        ) : unknown ? (
          <span className="flex items-center gap-1 text-muted-foreground">
            <WifiOff className="h-3.5 w-3.5" /> Version déployée indisponible (hors ligne ou mode dev)
          </span>
        ) : upToDate ? (
          <span className="flex items-center gap-1 text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> À jour
          </span>
        ) : (
          <span className="flex items-center gap-1 text-amber-600">
            <AlertCircle className="h-3.5 w-3.5" /> Nouvelle version disponible
          </span>
        )}

        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-7 gap-1 px-2" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            Vérifier
          </Button>
          {!loading && !unknown && !upToDate && (
            <Button size="sm" className="h-7 px-2" onClick={checkForUpdate} disabled={isChecking}>
              {isChecking ? 'Mise à jour…' : 'Mettre à jour'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuildVersionBadge;
