import { afterEach, describe, expect, it, vi } from 'vitest';
import { startNativeHifzSpeech, type HifzSpeechBridge } from './hifzNativeSpeech';

function fakeBridge() {
  let emit: (event: { text?: string; final?: boolean; error?: number }) => void = () => undefined;
  const remove = vi.fn(async () => undefined);
  const bridge: HifzSpeechBridge = {
    available: vi.fn(async () => ({ available: true })),
    start: vi.fn(async () => undefined), stop: vi.fn(async () => undefined),
    addListener: vi.fn(async (_, callback) => { emit = callback; return { remove }; }),
  };
  return { bridge, remove, emit: (event: Parameters<typeof emit>[0]) => emit(event) };
}
afterEach(() => { vi.useRealTimers(); });
describe('Reconnaissance vocale Android', () => {
  it('ne tente pas la WebView ni le micro si le service Android est absent', async () => {
    const { bridge } = fakeBridge();
    vi.mocked(bridge.available).mockResolvedValue({ available: false });
    await expect(startNativeHifzSpeech(vi.fn(), vi.fn(), bridge)).rejects.toThrow('service de reconnaissance vocale');
    expect(bridge.start).not.toHaveBeenCalled();
  });
  it('remplace les résultats provisoires sans répéter les mots et conserve les phrases finales', async () => {
    vi.useFakeTimers();
    const f = fakeBridge(), onText = vi.fn();
    const stop = await startNativeHifzSpeech(onText, vi.fn(), f.bridge);
    f.emit({ text: 'بسم' });
    f.emit({ text: 'بسم الله' });
    f.emit({ text: 'بسم الله', final: true });
    await vi.advanceTimersByTimeAsync(400);
    f.emit({ text: 'الرحمن الرحيم', final: true });
    expect(onText.mock.calls.map(c => c[0])).toEqual(['بسم', 'بسم الله', 'بسم الله', 'بسم الله الرحمن الرحيم']);
    expect(f.bridge.start).toHaveBeenCalledTimes(2);
    await stop();
  });
  it('arrête les relances et libère les écouteurs lors de Terminer', async () => {
    vi.useFakeTimers();
    const f = fakeBridge(), onText = vi.fn();
    const stop = await startNativeHifzSpeech(onText, vi.fn(), f.bridge);
    f.emit({ text: 'بسم الله', final: true });
    await stop();
    await vi.advanceTimersByTimeAsync(1000);
    f.emit({ text: 'résultat tardif' });
    expect(f.bridge.start).toHaveBeenCalledTimes(1);
    expect(onText).toHaveBeenCalledTimes(1);
    expect(f.remove).toHaveBeenCalledTimes(1);
  });
  it('signale le refus du microphone sans boucle de relance', async () => {
    const f = fakeBridge(), onError = vi.fn();
    await startNativeHifzSpeech(vi.fn(), onError, f.bridge);
    f.emit({ error: 9 });
    expect(onError).toHaveBeenCalledWith('Autorisez le microphone dans les réglages Android de l’application.');
    expect(f.remove).toHaveBeenCalledTimes(1);
  });
  it('signale un micro silencieux après trois essais plutôt que rester bloqué', async () => {
    vi.useFakeTimers();
    const f = fakeBridge(), onError = vi.fn();
    await startNativeHifzSpeech(vi.fn(), onError, f.bridge);
    for (let i = 0; i < 3; i++) { f.emit({ error: 6 }); await vi.advanceTimersByTimeAsync(400); }
    expect(f.bridge.start).toHaveBeenCalledTimes(3);
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('Aucune voix détectée'));
  });
});