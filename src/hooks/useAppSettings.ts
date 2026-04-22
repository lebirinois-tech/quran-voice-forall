import { useState, useEffect, useCallback } from 'react';
import { ReciterId } from './useQuranAudio';

export type TextDisplayStyle = 'tajweed' | 'simple' | 'warsh-text' | 'warsh-tajweed' | 'mushaf-hafs' | 'mushaf-warsh' | 'mushaf-warsh-tajweed' | 'mushaf-qalun';
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';

const STORAGE_KEYS = {
  RECITER: 'quran-reciter',
  BACKGROUND_COLOR: 'quran-background-color',
  TEXT_DISPLAY_STYLE: 'quran-text-display-style',
  FONT_SIZE: 'quran-font-size',
  SHOW_DUAL_TRANSLATION: 'quran-show-dual-translation',
};

const DEFAULT_BACKGROUND = 'hsl(45, 30%, 96%)';

const DUAL_TRANSLATION_EVENT = 'quran-dual-translation-changed';

export const useAppSettings = () => {
  const [reciter, setReciter] = useState<ReciterId>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.RECITER);
    return (saved as ReciterId) || 'alafasy';
  });

  const [backgroundColor, setBackgroundColor] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.BACKGROUND_COLOR) || DEFAULT_BACKGROUND;
  });

  const [textDisplayStyle, setTextDisplayStyle] = useState<TextDisplayStyle>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TEXT_DISPLAY_STYLE);
    return (saved as TextDisplayStyle) || 'tajweed';
  });

  const [fontSize, setFontSize] = useState<FontSize>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FONT_SIZE);
    return (saved as FontSize) || 'medium';
  });

  const [showDualTranslation, setShowDualTranslation] = useState<boolean>(() => {
    // Default ON: show Arabic + primary translation + secondary translation
    // (e.g. FR + EN). The user can still disable it from Settings.
    const saved = localStorage.getItem(STORAGE_KEYS.SHOW_DUAL_TRANSLATION);
    return saved === null ? true : saved === 'true';
  });

  // Sync this hook instance with changes coming from any other instance.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      if (typeof detail === 'boolean') setShowDualTranslation(detail);
    };
    window.addEventListener(DUAL_TRANSLATION_EVENT, handler);
    return () => window.removeEventListener(DUAL_TRANSLATION_EVENT, handler);
  }, []);

  // Apply background color to document
  useEffect(() => {
    document.documentElement.style.setProperty('--background', backgroundColor.replace('hsl(', '').replace(')', ''));
    document.body.style.backgroundColor = backgroundColor;
  }, [backgroundColor]);

  const handleReciterChange = useCallback((newReciter: ReciterId) => {
    setReciter(newReciter);
    localStorage.setItem(STORAGE_KEYS.RECITER, newReciter);
  }, []);

  const handleBackgroundColorChange = useCallback((color: string) => {
    setBackgroundColor(color);
    localStorage.setItem(STORAGE_KEYS.BACKGROUND_COLOR, color);
  }, []);

  const handleTextDisplayStyleChange = useCallback((style: TextDisplayStyle) => {
    setTextDisplayStyle(style);
    localStorage.setItem(STORAGE_KEYS.TEXT_DISPLAY_STYLE, style);
  }, []);

  const handleFontSizeChange = useCallback((size: FontSize) => {
    setFontSize(size);
    localStorage.setItem(STORAGE_KEYS.FONT_SIZE, size);
  }, []);

  const handleShowDualTranslationChange = useCallback((value: boolean) => {
    setShowDualTranslation(value);
    localStorage.setItem(STORAGE_KEYS.SHOW_DUAL_TRANSLATION, String(value));
    // Broadcast so all useAppSettings() instances stay in sync.
    window.dispatchEvent(
      new CustomEvent(DUAL_TRANSLATION_EVENT, { detail: value }),
    );
  }, []);

  return {
    reciter,
    backgroundColor,
    textDisplayStyle,
    fontSize,
    showDualTranslation,
    onReciterChange: handleReciterChange,
    onBackgroundColorChange: handleBackgroundColorChange,
    onTextDisplayStyleChange: handleTextDisplayStyleChange,
    onFontSizeChange: handleFontSizeChange,
    onShowDualTranslationChange: handleShowDualTranslationChange,
  };
};
