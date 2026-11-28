import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

interface SpeechEvent { text?: string; final?: boolean; error?: number }
export interface HifzSpeechBridge {
  available(): Promise<{ available: boolean }>;
  start(): Promise<void>;
  stop(): Promise<void>;
  addListener(event: 'result', callback: (event: SpeechEvent) => void): Promise<PluginListenerHandle>;
}
const bridge = registerPlugin<HifzSpeechBridge>('HifzSpeech');

export async function startNativeHifzSpeech(
  onText: (text: string) => void,
  onError: (message: string) => void,
  native: HifzSpeechBridge = bridge,
): Promise<() => Promise<void>> {
  if (!(await native.available()).available) {
    throw new Error('Le service de reconnaissance vocale Android est absent sur cette console. Activez ou installez un service vocal compatible avec l’arabe.');
  }
  let stopped = false;
  let committed = '';
  let emptySessions = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let listener: PluginListenerHandle | undefined;
  const stop = async () => {
    stopped = true;
    clearTimeout(timer);
    await listener?.remove();
    await native.stop();
  };
  const fail = (message: string) => {
    void stop().catch(() => undefined);
    onError(message);
  };
  const restart = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!stopped) void native.start().catch(() => fail('Impossible d’accéder au microphone. Vérifiez son autorisation et son branchement.'));
    }, 400);
  };
  listener = await native.addListener('result', event => {
    if (stopped) return;
    if (event.error !== undefined) {
      if ((event.error === 6 || event.error === 7) && ++emptySessions < 3) { restart(); return; }
      fail(event.error === 9 ? 'Autorisez le microphone dans les réglages Android de l’application.'
        : event.error === 6 || event.error === 7 ? 'Aucune voix détectée. Vérifiez que le microphone est branché et utilisable par les applications.'
        : 'La reconnaissance vocale Android s’est arrêtée. Vérifiez le microphone, le service vocal et la connexion Internet.');
      return;
    }
    const text = event.text?.trim() ?? '';
    if (text) { emptySessions = 0; onText([committed, text].filter(Boolean).join(' ')); }
    if (event.final) {
      committed = [committed, text].filter(Boolean).join(' ');
      restart();
    }
  });
  try { await native.start(); }
  catch (error) { await stop(); throw error; }
  return stop;
}