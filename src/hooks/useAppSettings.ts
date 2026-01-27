import { useState, useEffect, useCallback } from 'react';
import { ReciterId } from './useQuranAudio';

const STORAGE_KEYS = {
  RECITER: 'quran-reciter',
  BACKGROUND_COLOR: 'quran-background-color',
};

const DEFAULT_BACKGROUND = 'hsl(45, 30%, 96%)';

export const useAppSettings = () => {
  const [reciter, setReciter] = useState<ReciterId>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.RECITER);
    return (saved as ReciterId) || 'alafasy';
  });

  const [backgroundColor, setBackgroundColor] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.BACKGROUND_COLOR) || DEFAULT_BACKGROUND;
  });

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

  return {
    reciter,
    backgroundColor,
    onReciterChange: handleReciterChange,
    onBackgroundColorChange: handleBackgroundColorChange,
  };
};
