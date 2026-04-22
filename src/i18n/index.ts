import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { fr } from './locales/fr';
import { en } from './locales/en';
import { ar } from './locales/ar';

export const SUPPORTED_LANGUAGES = ['fr', 'en', 'ar'] as const;
export type AppLanguage = typeof SUPPORTED_LANGUAGES[number];

export const LANGUAGE_LABELS: Record<AppLanguage, { label: string; native: string; flag: string }> = {
  fr: { label: 'Français', native: 'Français', flag: '🇫🇷' },
  en: { label: 'English', native: 'English', flag: '🇬🇧' },
  ar: { label: 'Arabic', native: 'العربية', flag: '🇸🇦' },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      ar: { translation: ar },
    },
    fallbackLng: 'fr',
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'app-language',
      caches: ['localStorage'],
    },
  });

// Keep <html lang> and dir in sync with the active language.
const applyHtmlAttrs = (lng: string) => {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lng;
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
};
applyHtmlAttrs(i18n.language || 'fr');
i18n.on('languageChanged', applyHtmlAttrs);

export default i18n;