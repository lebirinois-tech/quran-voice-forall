import { describe, expect, it } from 'vitest';
import { configureTafsirUtterance, selectTafsirVoice, splitTafsirSpeech } from './tafsirSpeech';

const voice = (name: string, lang: string) => ({ name, lang, default: false, localService: true, voiceURI: name } as SpeechSynthesisVoice);

describe('Tafsir speech', () => {
  it('prefers a known male Arabic voice over the default or female Saudi voice', () => {
    const male = voice('Microsoft Naayf', 'ar-SA');
    expect(selectTafsirVoice([voice('French male', 'fr-FR'), voice('Hoda', 'ar-EG'), male], 'ar')).toBe(male);
    expect(selectTafsirVoice([voice('Zariyah', 'ar-SA'), voice('Hamdan', 'ar-AE')], 'ar')?.name).toBe('Hamdan');
  });
  it('does not select a non-Arabic voice when Arabic is absent', () => {
    expect(selectTafsirVoice([voice('English', 'en-US')], 'ar')).toBeUndefined();
    expect(selectTafsirVoice([voice('Arabic', 'ar_EG')], 'ar')?.lang).toBe('ar_EG');
  });
  it('keeps diacritics, punctuation and all words in bounded chunks', () => {
    const text = `إِنَّ اللهَ غَفُورٌ، رَحِيمٌ؛ ${'تفسير طويل '.repeat(60)}نهاية.`;
    const chunks = splitTafsirSpeech(text);
    expect(chunks.join(' ')).toBe(text.trim());
    expect(chunks.every(chunk => chunk.length <= 220)).toBe(true);
    expect(chunks[0]).toBe('إِنَّ اللهَ غَفُورٌ،');
  });
  it('uses a neutral pitch and the selected Arabic locale', () => {
    const utterance = {} as SpeechSynthesisUtterance;
    const selected = voice('Naayf', 'ar-SA');
    configureTafsirUtterance(utterance, 'ar', selected);
    expect(utterance).toMatchObject({ voice: selected, lang: 'ar-SA', rate: 0.9, pitch: 1, volume: 1 });
  });
});