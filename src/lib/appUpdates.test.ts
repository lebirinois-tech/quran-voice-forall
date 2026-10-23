import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchApkVersion, isNewerVersion, UPDATE_INTERVAL_MS, UPDATE_START_DELAY_MS } from './appUpdates';

afterEach(() => vi.unstubAllGlobals());

describe('Intelligent application updates', () => {
  it('checks 2 seconds after launch and every 5 minutes', () => {
    expect(UPDATE_START_DELAY_MS).toBe(2000);
    expect(UPDATE_INTERVAL_MS).toBe(300000);
  });
  it('never offers the same version or a downgrade', () => {
    const local = { buildId: 'current', buildTime: '2026-10-23T22:00:00Z' };
    expect(isNewerVersion({ ...local, buildId: 'older', buildTime: '2026-10-22T22:00:00Z' }, local)).toBe(false);
    expect(isNewerVersion(local, local)).toBe(false);
    expect(isNewerVersion({ buildId: 'new', buildTime: '2026-10-24T22:00:00Z' }, local)).toBe(true);
  });
  it('compares the exact APK build rather than the upload time or site version', async () => {
    const version = { buildId: 'apk-build', buildTime: '2026-10-23T22:00:00Z' };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      assets: [{ name: 'quran-acces-pour-tous.apk', updated_at: '2026-10-23T22:15:00Z' }],
      body: `<!-- quran-apk-version:${JSON.stringify(version)} -->`,
    }) });
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchApkVersion()).toEqual(version);
    expect(fetchMock.mock.calls[0][0]).toContain('/releases/tags/latest');
  });
  it('uses legacy APK asset time, not the original release creation date', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      published_at: '2026-06-17T09:03:18Z',
      assets: [{ name: 'quran-acces-pour-tous.apk', updated_at: '2026-10-22T02:37:48Z' }],
    }) }));
    expect((await fetchApkVersion())?.buildTime).toBe('2026-10-22T02:37:48Z');
  });
  it('does not report up to date when the release is unreachable or has no APK', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await fetchApkVersion()).toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ assets: [] }) }));
    expect(await fetchApkVersion()).toBeNull();
  });
});