export interface VersionInfo {
  buildId: string;
  buildTime: string;
}

export const LOCAL_VERSION: VersionInfo = {
  buildId: typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : 'dev',
  buildTime: typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : new Date().toISOString(),
};

/** Récupère la version déployée (sans cache ni service worker). */
export const fetchDeployedVersion = async (): Promise<VersionInfo | null> => {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<VersionInfo>;
    if (!data?.buildId) return null;
    return { buildId: data.buildId, buildTime: data.buildTime ?? '' };
  } catch {
    return null;
  }
};

export const formatBuildTime = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
};
