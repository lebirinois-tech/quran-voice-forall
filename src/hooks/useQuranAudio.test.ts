import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RECITERS, getSafeReciter, getReciterAudioUrl, useQuranAudio, type ReciterId } from './useQuranAudio';
import { useAppSettings } from './useAppSettings';

vi.mock('@/lib/offlineAudioStore', () => ({ getOfflineAudioUrl: vi.fn(async () => null) }));
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

describe('Requested Qaloun reciter', () => {
  it('offers El Ganayni with exact full-surah recordings for all 114 surahs', () => {
    expect(getSafeReciter('ganayniQalun')).toBe('ganayniQalun');
    expect(RECITERS.ganayniQalun.qiraat).toBe('qalun');
    expect(RECITERS.ganayniQalun.fullSurah).toBe(true);
    expect(Object.keys(RECITERS.ganayniQalun.fullSurahUrls ?? {})).toHaveLength(114);
    expect(getReciterAudioUrl(1, 1, 'ganayniQalun')).toBe(
      'https://media.assabile.com/assabile/recitations_7892537823/mp3/mohammad-omar-el-ganayni/mohammad-omar-el-ganayni-001-al-fatiha-42407-2757.mp3',
    );
    for (let surah = 1; surah <= 114; surah++) {
      expect(getReciterAudioUrl(surah, 1, 'ganayniQalun')).toContain(`ganayni-${String(surah).padStart(3, '0')}-`);
    }
  });
  it('keeps El Ganayni across Qaloun Pages and Verses', () => {
    localStorage.setItem('quran-reciter', 'ganayniQalun');
    const { result } = renderHook(() => useAppSettings());
    act(() => result.current.onTextDisplayStyleChange('qalun-tajweed'));
    expect(result.current.reciter).toBe('ganayniQalun');
    act(() => result.current.onTextDisplayStyleChange('pages-qalun'));
    expect(result.current.reciter).toBe('ganayniQalun');
  });
  it('starts full-surah recordings at verse 1 rather than claiming to seek to verse 100', async () => {
    const { result, unmount } = renderHook(() => useQuranAudio({ surahNumber: 10, totalVerses: 109, reciter: 'ganayniQalun' }));
    await act(async () => { await result.current.playVerse(100); });
    expect(result.current.currentVerse).toBe(1);
    expect(document.querySelector('audio')?.src).toBe(getReciterAudioUrl(10, 1, 'ganayniQalun'));
    act(() => result.current.nextVerse());
    expect(result.current.currentVerse).toBe(1);
    unmount();
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