import { useState, useEffect, useCallback } from 'react';
import { getSafeReciter, ReciterId } from './useQuranAudio';

export type TextDisplayStyle =
  | 'tajweed'
  | 'warsh-tajweed'
  | 'qalun-tajweed'
  | 'pages-hafs'
  | 'pages-warsh'
  | 'pages-qalun';
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';
/** Mode d'affichage des versets : défilement continu ou page par page (une page du Mushaf à la fois). */
export type VerseViewMode = 'scroll' | 'page';

/**
 * Récitateur par défaut pour chaque qira'a / mode d'affichage.
 * Permet d'aligner automatiquement l'audio avec la lecture choisie.
 */
const STYLE_TO_RECITER: Record<TextDisplayStyle, ReciterId> = {
  'tajweed': 'husary',
  'pages-hafs': 'husary',
  'warsh-tajweed': 'husaryWarshPerVerse',
  'pages-warsh': 'husaryWarshPerVerse',
  'qalun-tajweed': 'husaryQalunPerVerse',
  'pages-qalun': 'husaryQalunPerVerse',
};

const STORAGE_KEYS = {
  RECITER: 'quran-reciter',
  BACKGROUND_COLOR: 'quran-background-color',
  TEXT_DISPLAY_STYLE: 'quran-text-display-style',
  FONT_SIZE: 'quran-font-size',
  VERSE_VIEW_MODE: 'quran-verse-view-mode',
};

const DEFAULT_BACKGROUND = 'hsl(45, 30%, 96%)';

export const useAppSettings = () => {
  const [reciter, setReciter] = useState<ReciterId>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.RECITER);
    const safeReciter = getSafeReciter(saved);
    if (saved !== safeReciter) localStorage.setItem(STORAGE_KEYS.RECITER, safeReciter);
    return safeReciter;
  });

  const [backgroundColor, setBackgroundColor] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.BACKGROUND_COLOR) || DEFAULT_BACKGROUND;
  });

  const [textDisplayStyle, setTextDisplayStyle] = useState<TextDisplayStyle>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TEXT_DISPLAY_STYLE);
    // Migration : les anciens modes retirés basculent vers un équivalent conservé.
    const ALLOWED: TextDisplayStyle[] = [
      'tajweed',
      'warsh-tajweed',
      'qalun-tajweed',
      'pages-hafs',
      'pages-warsh',
      'pages-qalun',
    ];
    const MIGRATIONS: Record<string, TextDisplayStyle> = {
      simple: 'tajweed',
      'warsh-text': 'warsh-tajweed',
      'qalun-text': 'qalun-tajweed',
      'mushaf-warsh-tajweed': 'warsh-tajweed',
      'mushaf-hafs': 'pages-hafs',
      'mushaf-warsh': 'pages-warsh',
      'mushaf-qalun': 'pages-qalun',
      // Mushafs vidéo retirés : bascule sur le rendu texte Tajweed équivalent.
      'mushaf-hafs-video': 'pages-hafs',
      'mushaf-warsh-video': 'pages-warsh',
      'mushaf-qalun-video': 'pages-qalun',
      'pages-hafs-video': 'pages-hafs',
      'pages-warsh-video': 'pages-warsh',
      'pages-qalun-video': 'pages-qalun',
    };
    if (saved && ALLOWED.includes(saved as TextDisplayStyle)) return saved as TextDisplayStyle;
    if (saved && MIGRATIONS[saved]) {
      localStorage.setItem(STORAGE_KEYS.TEXT_DISPLAY_STYLE, MIGRATIONS[saved]);
      return MIGRATIONS[saved];
    }
    return 'tajweed';
  });

  const [fontSize, setFontSize] = useState<FontSize>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FONT_SIZE);
    return (saved as FontSize) || 'medium';
  });

  const [verseViewMode, setVerseViewMode] = useState<VerseViewMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.VERSE_VIEW_MODE);
    return saved === 'page' ? 'page' : 'scroll';
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

  const handleTextDisplayStyleChange = useCallback((style: TextDisplayStyle) => {
    setTextDisplayStyle(style);
    localStorage.setItem(STORAGE_KEYS.TEXT_DISPLAY_STYLE, style);
    // Aligne automatiquement le récitateur avec la qira'a affichée
    const matchingReciter = STYLE_TO_RECITER[style];
    if (matchingReciter) {
      setReciter(matchingReciter);
      localStorage.setItem(STORAGE_KEYS.RECITER, matchingReciter);
    }
  }, []);

  const handleFontSizeChange = useCallback((size: FontSize) => {
    setFontSize(size);
    localStorage.setItem(STORAGE_KEYS.FONT_SIZE, size);
  }, []);

  return {
    reciter,
    backgroundColor,
    textDisplayStyle,
    fontSize,
    onReciterChange: handleReciterChange,
    onBackgroundColorChange: handleBackgroundColorChange,
    onTextDisplayStyleChange: handleTextDisplayStyleChange,
    onFontSizeChange: handleFontSizeChange,
  };
};
