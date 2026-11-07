import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RECITERS, RECITER_IDS, getSafeReciter, getReciterAudioUrl, useQuranAudio, type ReciterId } from './useQuranAudio';
import { useAppSettings } from './useAppSettings';

vi.mock('@/lib/offlineAudioStore', () => ({ getOfflineAudioUrl: vi.fn(async () => null), isOnlineOnlyAudio: () => false }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(function () {
    const media = this;
    if (media.src) queueMicrotask(() => media.dispatchEvent(new Event('canplay')));
  });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
});
afterEach(() => {
  document.querySelectorAll('audio').forEach((audio) => audio.remove());
  vi.restoreAllMocks();
});

describe('Requested Warsh reciter', () => {
  it('offers Yassen Al-Jazairi as a saved Warsh voice with individual verse files', () => {
    expect(getSafeReciter('yassinWarsh')).toBe('yassinWarsh');
    expect(RECITERS.yassinWarsh.qiraat).toBe('warsh');
    expect(getReciterAudioUrl(10, 100, 'yassinWarsh')).toBe(
      'https://everyayah.com/data/warsh/warsh_yassin_al_jazaery_64kbps/010100.mp3',
    );
  });
  it('preserves Yassen when switching Warsh Pages and Verses', () => {
    localStorage.setItem('quran-reciter', 'yassinWarsh');
    const { result } = renderHook(() => useAppSettings());
    act(() => result.current.onTextDisplayStyleChange('warsh-tajweed'));
    expect(result.current.reciter).toBe('yassinWarsh');
    act(() => result.current.onTextDisplayStyleChange('pages-warsh'));
    expect(result.current.reciter).toBe('yassinWarsh');
  });
});

describe('Qaloun reciters', () => {
  it('offers Al-Husary and Al-Hudhaifi for Qaloun', () => {
    expect(RECITER_IDS.filter((id) => RECITERS[id].qiraat === 'qalun')).toEqual(['husaryQalunPerVerse', 'hudhaifiQalun']);
  });
  it('builds Al-Hudhaifi verse URLs from the juz archive', () => {
    const base = 'https://archive.org/download/way2sona_20160426_2135';
    expect(getReciterAudioUrl(1, 1, 'hudhaifiQalun')).toBe(`${base}/01.zip/001001.mp3`);
    expect(getReciterAudioUrl(2, 142, 'hudhaifiQalun')).toBe(`${base}/02.zip/002142.mp3`);
    expect(getReciterAudioUrl(36, 28, 'hudhaifiQalun')).toBe(`${base}/23.zip/23/036028.mp3`);
    expect(getReciterAudioUrl(41, 46, 'hudhaifiQalun')).toBe(`${base}/24.zip/24/041046.mp3`);
    expect(getReciterAudioUrl(114, 6, 'hudhaifiQalun')).toBe(`${base}/30.zip/114006.mp3`);
  });
  it('moves a saved El Ganayni choice to Al-Husary Qaloun', () => {
    expect(getSafeReciter('ganayniQalun')).toBe('husaryQalunPerVerse');
  });
});

describe('Maher Hafs recitation', () => {
  it('recognizes the saved Maher choice at startup', () => {
    expect(getSafeReciter('maher')).toBe('maher');
    expect(getSafeReciter('removed-reciter')).toBe('husary');
  });
  it('uses Maher verse files, including Yunus verse 100', () => {
    expect(getReciterAudioUrl(10, 100, 'maher')).toBe(
      'https://archive.org/download/way2sona_20160427_1847/010.zip/010100.mp3',
    );
    expect(getReciterAudioUrl(1, 1, 'maher')).toBe(
      'https://archive.org/download/way2sona_20160427_1847/001.zip/001001.mp3',
    );
  });

  it('keeps Maher when switching Hafs between Pages and Verses', () => {
    localStorage.setItem('quran-reciter', 'maher');
    const { result } = renderHook(() => useAppSettings());
    act(() => result.current.onTextDisplayStyleChange('tajweed'));
    expect(result.current.reciter).toBe('maher');
    act(() => result.current.onTextDisplayStyleChange('pages-hafs'));
    expect(localStorage.getItem('quran-reciter')).toBe('maher');
    act(() => result.current.onTextDisplayStyleChange('pages-warsh'));
    expect(result.current.reciter).toBe('husaryWarshPerVerse');
  });

  it('remembers Maher for Hafs and Yassine for Warsh across riwaya switches', () => {
    const { result } = renderHook(() => useAppSettings());
    act(() => result.current.onTextDisplayStyleChange('pages-hafs'));
    act(() => result.current.onReciterChange('maher'));
    act(() => result.current.onTextDisplayStyleChange('pages-warsh'));
    act(() => result.current.onReciterChange('yassinWarsh'));
    act(() => result.current.onTextDisplayStyleChange('tajweed'));
    expect(result.current.reciter).toBe('maher');
    act(() => result.current.onTextDisplayStyleChange('warsh-tajweed'));
    expect(result.current.reciter).toBe('yassinWarsh');
  });

  it('replaces a paused Husary source before resuming with Maher', async () => {
    const { result, rerender, unmount } = renderHook(
      ({ reciter }: { reciter: ReciterId }) => useQuranAudio({ surahNumber: 10, totalVerses: 109, reciter }),
      { initialProps: { reciter: 'husary' as ReciterId } },
    );
    await act(async () => { await result.current.playVerse(100); });
    act(() => result.current.pause());
    rerender({ reciter: 'maher' });
    act(() => result.current.play());
    await waitFor(() => expect(result.current.isPlaying).toBe(true));
    expect(document.querySelector('audio')?.src).toBe(getReciterAudioUrl(10, 100, 'maher'));
    unmount();
  });

  it('changes the currently playing recording immediately to Maher', async () => {
    const { result, rerender, unmount } = renderHook(
      ({ reciter }: { reciter: ReciterId }) => useQuranAudio({ surahNumber: 1, totalVerses: 7, reciter }),
      { initialProps: { reciter: 'husary' as ReciterId } },
    );
    await act(async () => { await result.current.playVerse(1); });
    rerender({ reciter: 'maher' });
    await waitFor(() => {
      expect(result.current.isPlaying).toBe(true);
      expect(document.querySelector('audio')?.src).toBe(getReciterAudioUrl(1, 1, 'maher'));
    });
    unmount();
  });
});

describe('Persistent audio and acceleration', () => {
  it('migrates the removed Juhani preference to Maher', () => {
    expect(getSafeReciter('juhani')).toBe('maher');
  });
  it('keeps the same player between verses and reciters', async () => {
    const { result, unmount } = renderHook(() => useQuranAudio({ surahNumber: 1, totalVerses: 7 }));
    const player = document.querySelector('audio');
    await act(async () => { await result.current.playVerse(1); });
    await act(async () => { await result.current.playVerse(2); });
    expect(document.querySelector('audio')).toBe(player);
    expect(player?.src).toBe(getReciterAudioUrl(1, 2, 'husary'));
    act(() => result.current.changeReciter('maher'));
    await waitFor(() => expect(player?.src).toBe(getReciterAudioUrl(1, 2, 'maher')));
    expect(document.querySelector('audio')).toBe(player);
    unmount();
  });
  it('supports 3x for Al-Hudhaifi without speed timers or timeupdate rewrites', async () => {
    const interval = vi.spyOn(window, 'setInterval');
    const timeout = vi.spyOn(window, 'setTimeout');
    const { result, unmount } = renderHook(() => useQuranAudio({ surahNumber: 1, totalVerses: 7, reciter: 'hudhaifiQalun' }));
    act(() => result.current.changeSpeed(3));
    await act(async () => { await result.current.playVerse(1); });
    const player = document.querySelector('audio');
    expect(player?.playbackRate).toBe(3);
    expect(player?.defaultPlaybackRate).toBe(3);
    interval.mockClear(); timeout.mockClear();
    act(() => { player?.dispatchEvent(new Event('timeupdate')); player?.dispatchEvent(new Event('playing')); });
    expect(interval).not.toHaveBeenCalled();
    expect(timeout).not.toHaveBeenCalled();
    await act(async () => { await result.current.playVerse(2); });
    expect(player?.playbackRate).toBe(3);
    unmount();
  });
});
