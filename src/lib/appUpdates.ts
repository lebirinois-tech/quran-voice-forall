import { Capacitor } from '@capacitor/core';
import { apkDownloadUrl, githubRepository, apkFileName } from './apkDownload';
import { LOCAL_VERSION, type VersionInfo } from './buildVersion';
import { fetchUpdateJson } from './fetchUpdateJson';

export const UPDATE_INTERVAL_MS = 5 * 60 * 1000;
export const UPDATE_START_DELAY_MS = 2000;
export const isNativeApp = () => Capacitor.isNativePlatform();

export const isNewerVersion = (remote: VersionInfo, local: VersionInfo) => {
  const remoteTime = Date.parse(remote.buildTime);
  const localTime = Date.parse(local.buildTime);
  return remote.buildId !== local.buildId && Number.isFinite(remoteTime) &&
    Number.isFinite(localTime) && remoteTime > localTime;
};

export const fetchApkVersion = async (): Promise<VersionInfo | null> => {
  try {
    // The web deployment is not the APK: compare only the published Android asset.
    const release = await fetchUpdateJson(`https://api.github.com/repos/${githubRepository}/releases/tags/latest`) as {
      assets?: { name: string; updated_at?: string }[];
      body?: string;
    };
    const apk = release?.assets?.find(asset => asset.name === apkFileName);
    if (!apk?.updated_at) return null;
    const marker = release.body?.match(/<!-- quran-apk-version:(\{[^\n]+\}) -->/);
    if (marker) {
      const version = JSON.parse(marker[1]) as Partial<VersionInfo>;
      if (typeof version.buildId === 'string' && typeof version.buildTime === 'string') {
        return { buildId: version.buildId, buildTime: version.buildTime };
      }
    }
    // Compatibility with releases built before the version marker was introduced.
    return { buildId: `apk-${apk.updated_at}`, buildTime: apk.updated_at };
  } catch {
    return null;
  }
};

export const openApkUpdate = async () => {
  // Android, not the app, owns the final installation confirmation.
  if (isNativeApp()) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url: apkDownloadUrl });
    return;
  }
  window.location.assign(apkDownloadUrl);
};

export const fetchInstalledUpdateVersion = async () => {
  if (isNativeApp()) return fetchApkVersion();
  const { fetchDeployedVersion } = await import('./buildVersion');
  return fetchDeployedVersion();
};

export const hasInstalledUpdate = (version: VersionInfo) => isNewerVersion(version, LOCAL_VERSION);