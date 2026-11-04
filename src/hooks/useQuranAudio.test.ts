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
    const base = 'https://archive.org/download/96kb--quran--by--alhozifi--by--qaloon---6236---ayaat-----__verse--by---verse--';
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

describe('Al-Juhani Hafs recitation', () => {
  it('recognizes the saved Al-Juhani choice at startup', () => {
    expect(getSafeReciter('juhani')).toBe('juhani');
    expect(getSafeReciter('removed-reciter')).toBe('husary');
  });
  it('uses Al-Juhani verse files, including Yunus verse 100', () => {
    expect(getReciterAudioUrl(10, 100, 'juhani')).toBe(
      'https://everyayah.com/data/Abdullaah_3awwaad_Al-Juhaynee_128kbps/010100.mp3',
    );
    expect(getReciterAudioUrl(1, 1, 'juhani')).toBe(
      'https://everyayah.com/data/Abdullaah_3awwaad_Al-Juhaynee_128kbps/001001.mp3',
    );
  });

  it('keeps Al-Juhani when switching Hafs between Pages and Verses', () => {
    localStorage.setItem('quran-reciter', 'juhani');
    const { result } = renderHook(() => useAppSettings());
    act(() => result.current.onTextDisplayStyleChange('tajweed'));
    expect(result.current.reciter).toBe('juhani');
    act(() => result.current.onTextDisplayStyleChange('pages-hafs'));
    expect(localStorage.getItem('quran-reciter')).toBe('juhani');
    act(() => result.current.onTextDisplayStyleChange('pages-warsh'));
    expect(result.current.reciter).toBe('husaryWarshPerVerse');
  });

  it('remembers Al-Juhani for Hafs and Yassine for Warsh across riwaya switches', () => {
    const { result } = renderHook(() => useAppSettings());
    act(() => result.current.onTextDisplayStyleChange('pages-hafs'));
    act(() => result.current.onReciterChange('juhani'));
    act(() => result.current.onTextDisplayStyleChange('pages-warsh'));
    act(() => result.current.onReciterChange('yassinWarsh'));
    act(() => result.current.onTextDisplayStyleChange('tajweed'));
    expect(result.current.reciter).toBe('juhani');
    act(() => result.current.onTextDisplayStyleChange('warsh-tajweed'));
    expect(result.current.reciter).toBe('yassinWarsh');
  });

  it('replaces a paused Husary source before resuming with Al-Juhani', async () => {
    const { result, rerender, unmount } = renderHook(
      ({ reciter }: { reciter: ReciterId }) => useQuranAudio({ surahNumber: 10, totalVerses: 109, reciter }),
      { initialProps: { reciter: 'husary' as ReciterId } },
    );
    await act(async () => { await result.current.playVerse(100); });
    act(() => result.current.pause());
    rerender({ reciter: 'juhani' });
    act(() => result.current.play());
    await waitFor(() => expect(result.current.isPlaying).toBe(true));
    expect(document.querySelector('audio')?.src).toBe(getReciterAudioUrl(10, 100, 'juhani'));
    unmount();
  });

  it('changes the currently playing recording immediately to Al-Juhani', async () => {
    const { result, rerender, unmount } = renderHook(
      ({ reciter }: { reciter: ReciterId }) => useQuranAudio({ surahNumber: 1, totalVerses: 7, reciter }),
      { initialProps: { reciter: 'husary' as ReciterId } },
    );
    await act(async () => { await result.current.playVerse(1); });
    rerender({ reciter: 'juhani' });
    await waitFor(() => {
      expect(result.current.isPlaying).toBe(true);
      expect(document.querySelector('audio')?.src).toBe(getReciterAudioUrl(1, 1, 'juhani'));
    });
    unmount();
  });
});