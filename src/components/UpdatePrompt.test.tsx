import { render, act, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), native: vi.fn(), newer: vi.fn(), info: vi.fn(), error: vi.fn(), success: vi.fn(), open: vi.fn(), pwa: vi.fn() }));
vi.mock('@/lib/registerPwa', () => ({ registerQuranPwa: vi.fn(), shouldRegisterPwa: () => true, checkPwaUpdate: mocks.pwa }));
vi.mock('@/lib/appUpdates', () => ({ fetchInstalledUpdateVersion: mocks.fetch, hasInstalledUpdate: mocks.newer, isNativeApp: mocks.native, openApkUpdate: mocks.open, UPDATE_INTERVAL_MS: 300000, UPDATE_START_DELAY_MS: 2000 }));
vi.mock('sonner', () => ({ toast: { info: mocks.info, error: mocks.error, success: mocks.success } }));
import { UpdatePrompt, useUpdateCheck } from './UpdatePrompt';

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  mocks.native.mockReturnValue(true);
  mocks.newer.mockReturnValue(true);
  mocks.fetch.mockResolvedValue({ buildId: 'new-apk', buildTime: '2026-10-24T00:00:00Z' });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('Global update monitor', () => {
  it('detects APK updates automatically but downloads only after the user presses the action', async () => {
    render(<UpdatePrompt />);
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.open).not.toHaveBeenCalled();
    expect(mocks.info).toHaveBeenCalledTimes(1);
    mocks.info.mock.calls[0][1].action.onClick();
    expect(mocks.open).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(298000));
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(mocks.info).toHaveBeenCalledTimes(1);
  });
  it('automatically applies web updates instead of offering an APK', async () => {
    mocks.native.mockReturnValue(false);
    render(<UpdatePrompt />);
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(mocks.pwa).toHaveBeenCalledTimes(1);
    expect(mocks.open).not.toHaveBeenCalled();
  });
  it('rechecks on reconnect and foreground, and stops after unmount', async () => {
    const { unmount } = render(<UpdatePrompt />);
    await act(async () => { window.dispatchEvent(new Event('online')); });
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    unmount();
    await act(() => vi.advanceTimersByTimeAsync(302000));
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it('manual buttons do not claim success when the version is unavailable', async () => {
    mocks.fetch.mockResolvedValue(null);
    let check: (() => Promise<void>) | undefined;
    const Control = () => { check = useUpdateCheck().checkForUpdate; return null; };
    render(<Control />);
    await act(async () => { await check?.(); });
    expect(mocks.error).toHaveBeenCalledTimes(1);
    expect(mocks.success).not.toHaveBeenCalled();
  });
});