import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTafsirSpeech } from '@/hooks/useTafsirSpeech';
import { disabledTafsirSpeechResponse } from '../../supabase/functions/tafsir-tts/handler';

afterEach(() => vi.unstubAllGlobals());
describe('device-only Tafsir policy', () => {
  it('rejects generation for every caller without making any upstream request', async () => {
    const fetchSpy = vi.fn(); vi.stubGlobal('fetch', fetchSpy);
    for (const headers of [{}, { Authorization: 'Bearer old-client' }]) {
      const response = disabledTafsirSpeechResponse(new Request('https://example.test', { method: 'POST', headers, body: JSON.stringify({ text: 'تفسير', lang: 'ar' }) }), {});
      expect(response.status).toBe(410);
      expect((await response.json()).code).toBe('DEVICE_SPEECH_ONLY');
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('reads Arabic with the device male voice and never calls a paid endpoint', async () => {
    const fetchSpy = vi.fn(); vi.stubGlobal('fetch', fetchSpy);
    const male = { name: 'Naayf', lang: 'ar-SA' } as SpeechSynthesisVoice;
    const speak = vi.fn();
    vi.stubGlobal('speechSynthesis', { getVoices: () => [male], speak, resume: vi.fn(), cancel: vi.fn() });
    vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(public text: string) {} });
    const { result } = renderHook(() => useTafsirSpeech('test'));
    act(() => result.current.toggle('ar', 'إِنَّ اللهَ غَفُورٌ.'));
    await waitFor(() => expect(speak).toHaveBeenCalledTimes(1));
    expect(speak.mock.calls[0][0]).toMatchObject({ text: 'إِنَّ اللهَ غَفُورٌ.', voice: male, lang: 'ar-SA' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});