import { useEffect, useState } from 'react';

export type AppLang = 'fr' | 'ar' | 'en';

const STORAGE_KEY = 'app-lang';
const EVENT = 'app-lang-change';

export const getAppLang = (): AppLang => {
  if (typeof window === 'undefined') return 'fr';
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'ar' || v === 'en' ? v : 'fr';
};

export const setAppLang = (lang: AppLang) => {
  localStorage.setItem(STORAGE_KEY, lang);
  window.dispatchEvent(new CustomEvent<AppLang>(EVENT, { detail: lang }));
};

export const useAppLang = (): AppLang => {
  const [lang, setLang] = useState<AppLang>(getAppLang);
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<AppLang>).detail;
      if (detail) setLang(detail);
    };
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);
  return lang;
};

type Dict = Record<string, { fr: string; ar: string; en: string }>;

const dict: Dict = {
  // Settings dialog
  settings: { fr: 'Paramètres', ar: 'الإعدادات', en: 'Settings' },
  language: { fr: 'Langue', ar: 'اللغة', en: 'Language' },
  languageHint: {
    fr: 'Langue des menus, des commandes vocales et de la lecture des traductions',
    ar: 'لغة القوائم والأوامر الصوتية وقراءة الترجمة',
    en: 'Language of menus, voice commands and translation reading',
  },
  reciter: { fr: 'Récitateur', ar: 'القارئ', en: 'Reciter' },
  reciterAuto: {
    fr: "L'audio suit automatiquement la riwaya choisie (Hafs, Warsh, Qalun)",
    ar: 'الصوت يتبع الرواية المختارة تلقائياً (حفص، ورش، قالون)',
    en: 'Audio automatically follows the chosen riwaya (Hafs, Warsh, Qalun)',
  },
  displayStyle: { fr: "Style d'affichage", ar: 'نمط العرض', en: 'Display style' },
  verseDisplay: { fr: 'Affichage des versets', ar: 'عرض الآيات', en: 'Verse display' },
  scrollMode: { fr: 'Défilement', ar: 'تمرير', en: 'Scroll' },
  scrollModeDesc: { fr: 'Toutes les pages à la suite', ar: 'كل الصفحات متتالية', en: 'All pages in a row' },
  pageMode: { fr: 'Page par page', ar: 'صفحة بصفحة', en: 'Page by page' },
  pageModeDesc: { fr: 'Une page du Mushaf à la fois', ar: 'صفحة واحدة من المصحف في كل مرة', en: 'One Mushaf page at a time' },
  themeKept: {
    fr: 'Le coloriage thématique des versets est conservé dans les deux modes.',
    ar: 'يُحفظ التلوين الموضوعي للآيات في كلا الوضعين.',
    en: 'Thematic verse coloring is kept in both modes.',
  },
  fontSize: { fr: 'Taille de police', ar: 'حجم الخط', en: 'Font size' },
  fontSmall: { fr: 'Petit', ar: 'صغير', en: 'Small' },
  fontMedium: { fr: 'Moyen', ar: 'متوسط', en: 'Medium' },
  fontLarge: { fr: 'Grand', ar: 'كبير', en: 'Large' },
  fontXLarge: { fr: 'Très grand', ar: 'كبير جداً', en: 'Extra large' },
  bgColor: { fr: 'Couleur de fond', ar: 'لون الخلفية', en: 'Background color' },
  bgDefault: { fr: 'Crème', ar: 'كريمي', en: 'Cream' },
  bgWhite: { fr: 'Blanc', ar: 'أبيض', en: 'White' },
  bgSepia: { fr: 'Sépia', ar: 'بني فاتح', en: 'Sepia' },
  bgDark: { fr: 'Sombre', ar: 'داكن', en: 'Dark' },
  bgNight: { fr: 'Nuit', ar: 'ليلي', en: 'Night' },
  bgEmerald: { fr: 'Émeraude', ar: 'زمردي', en: 'Emerald' },
  downloadAudio: { fr: "Télécharger l'audio", ar: 'تحميل الصوت', en: 'Download audio' },
  surahDownload: { fr: 'Sourate', ar: 'السورة', en: 'Surah' },
  fullQuran: { fr: 'Quran complet', ar: 'القرآن كاملاً', en: 'Full Quran' },
  openSurahToDownload: {
    fr: 'Ouvrez une sourate pour télécharger son audio',
    ar: 'افتح سورة لتحميل صوتها',
    en: 'Open a surah to download its audio',
  },
  downloadError: { fr: 'Erreur de téléchargement', ar: 'خطأ في التحميل', en: 'Download error' },
  redirectQuranicAudio: {
    fr: 'Redirection vers QuranicAudio pour le Quran complet',
    ar: 'تحويل إلى QuranicAudio للقرآن الكامل',
    en: 'Redirecting to QuranicAudio for the full Quran',
  },
  // Display styles
  styleHafsVerse: { fr: 'Hafs Tajweed (verset)', ar: 'حفص تجويد (آيات)', en: 'Hafs Tajweed (verses)' },
  styleHafsVerseDesc: { fr: 'Texte Hafs coloré verset par verset', ar: 'نص حفص ملون آية بآية', en: 'Hafs text colored verse by verse' },
  styleWarshVerse: { fr: 'Warsh Tajweed (verset)', ar: 'ورش تجويد (آيات)', en: 'Warsh Tajweed (verses)' },
  styleWarshVerseDesc: { fr: 'Texte Warsh verset par verset avec Tajweed coloré', ar: 'نص ورش آية بآية مع تجويد ملون', en: 'Warsh text verse by verse with colored Tajweed' },
  styleQalunVerse: { fr: 'Qalun Tajweed (verset)', ar: 'قالون تجويد (آيات)', en: 'Qalun Tajweed (verses)' },
  styleQalunVerseDesc: { fr: 'Texte Qalun verset par verset avec Tajweed coloré', ar: 'نص قالون آية بآية مع تجويد ملون', en: 'Qalun text verse by verse with colored Tajweed' },
  styleHafsPages: { fr: 'Mushaf Hafs (pages)', ar: 'مصحف حفص (صفحات)', en: 'Hafs Mushaf (pages)' },
  styleHafsPagesDesc: { fr: 'Mushaf Hafs Tajweed page par page — hors ligne', ar: 'مصحف حفص بالتجويد صفحة بصفحة — بدون إنترنت', en: 'Hafs Tajweed Mushaf page by page — offline' },
  styleWarshPages: { fr: 'Mushaf Warsh (pages)', ar: 'مصحف ورش (صفحات)', en: 'Warsh Mushaf (pages)' },
  styleWarshPagesDesc: { fr: 'Mushaf Warsh Tajweed page par page — hors ligne', ar: 'مصحف ورش بالتجويد صفحة بصفحة — بدون إنترنت', en: 'Warsh Tajweed Mushaf page by page — offline' },
  styleQalunPages: { fr: 'Mushaf Qalun (pages)', ar: 'مصحف قالون (صفحات)', en: 'Qalun Mushaf (pages)' },
  styleQalunPagesDesc: { fr: 'Mushaf Qalun Tajweed page par page — hors ligne', ar: 'مصحف قالون بالتجويد صفحة بصفحة — بدون إنترنت', en: 'Qalun Tajweed Mushaf page by page — offline' },
  // Header
  appTitle: { fr: 'Quran Accès Pour Tous', ar: 'القرآن للجميع', en: 'Quran For All' },
  appSubtitle: { fr: 'Le Coran accessible à tous', ar: 'القرآن الكريم في متناول الجميع', en: 'The Quran accessible to everyone' },
  backHome: { fr: "Retour à l'accueil", ar: 'العودة إلى الرئيسية', en: 'Back to home' },
  readingLang: { fr: 'Langue de lecture', ar: 'لغة القراءة', en: 'Reading language' },
  handsFreeOn: { fr: 'Activer le mode mains libres', ar: 'تفعيل الوضع بدون استخدام اليدين', en: 'Enable hands-free mode' },
  handsFreeOff: { fr: 'Désactiver le mode mains libres', ar: 'إيقاف الوضع بدون استخدام اليدين', en: 'Disable hands-free mode' },
  accessibilityMode: { fr: 'Mode accessibilité', ar: 'وضع إمكانية الوصول', en: 'Accessibility mode' },
  // Index page
  reset: { fr: 'Réinitialiser', ar: 'إعادة تعيين', en: 'Reset' },
  login: { fr: 'Connexion', ar: 'تسجيل الدخول', en: 'Sign in' },
  logout: { fr: 'Déconnexion', ar: 'تسجيل الخروج', en: 'Sign out' },
  logoutError: { fr: 'Erreur lors de la déconnexion', ar: 'خطأ أثناء تسجيل الخروج', en: 'Sign-out error' },
  logoutSuccess: { fr: 'Déconnexion réussie', ar: 'تم تسجيل الخروج بنجاح', en: 'Signed out successfully' },
  resumeReading: { fr: 'Reprendre la lecture', ar: 'متابعة القراءة', en: 'Resume reading' },
  verse: { fr: 'Verset', ar: 'آية', en: 'Verse' },
  continue: { fr: 'Continuer', ar: 'متابعة', en: 'Continue' },
  welcome: { fr: 'Bienvenue dans le Saint Coran', ar: 'مرحباً بكم في القرآن الكريم', en: 'Welcome to the Holy Quran' },
  welcomeSub: {
    fr: 'Lisez, écoutez et mémorisez le Coran avec des commandes vocales pour une accessibilité totale',
    ar: 'اقرأ واستمع واحفظ القرآن مع أوامر صوتية لوصول كامل للجميع',
    en: 'Read, listen and memorize the Quran with voice commands for full accessibility',
  },
  installApp: { fr: "Installer l'application", ar: 'تثبيت التطبيق', en: 'Install the app' },
  installOnPhone: { fr: 'Installer sur téléphone', ar: 'التثبيت على الهاتف', en: 'Install on phone' },
  downloadApk: { fr: "Télécharger l'APK", ar: 'تحميل APK', en: 'Download APK' },
  unsignedIpa: { fr: 'IPA non signé', ar: 'IPA غير موقّع', en: 'Unsigned IPA' },
  installNote: {
    fr: "L'APK s'installe directement sur Android. L'IPA nécessite une signature Apple Developer pour un iPhone physique.",
    ar: 'يتم تثبيت APK مباشرة على أندرويد. يتطلب IPA توقيع Apple Developer لجهاز iPhone فعلي.',
    en: 'The APK installs directly on Android. The IPA requires an Apple Developer signature for a physical iPhone.',
  },
  verses: { fr: 'Versets', ar: 'آيات', en: 'Verses' },
  pages: { fr: 'Pages', ar: 'صفحات', en: 'Pages' },
  chooseMode: {
    fr: "Choisissez le mode d'affichage et la riwaya (Tajweed coloré dans les trois lectures)",
    ar: 'اختر وضع العرض والرواية (تجويد ملون في القراءات الثلاث)',
    en: 'Choose the display mode and riwaya (colored Tajweed in all three readings)',
  },
  voiceNotSupported: {
    fr: 'Les commandes vocales ne sont pas supportées par votre navigateur',
    ar: 'الأوامر الصوتية غير مدعومة في متصفحك',
    en: 'Voice commands are not supported by your browser',
  },
  goToPage: { fr: 'Aller à la page', ar: 'اذهب إلى الصفحة', en: 'Go to page' },
  goToJuz: { fr: 'Aller au Juz', ar: 'اذهب إلى الجزء', en: 'Go to Juz' },
  pageNumber: { fr: 'Numéro de page', ar: 'رقم الصفحة', en: 'Page number' },
  juzNumber: { fr: 'Numéro de Juz', ar: 'رقم الجزء', en: 'Juz number' },
  searchSurah: { fr: 'Rechercher une sourate...', ar: 'ابحث عن سورة...', en: 'Search for a surah...' },
  surahs: { fr: 'Sourates', ar: 'سور', en: 'Surahs' },
  surahList: { fr: 'Liste des Sourates', ar: 'قائمة السور', en: 'Surah list' },
  noSurahFound: { fr: 'Aucune sourate trouvée', ar: 'لم يتم العثور على سورة', en: 'No surah found' },
  audioLibrary: { fr: 'Bibliothèque Audio', ar: 'المكتبة الصوتية', en: 'Audio Library' },
  invalidPage: { fr: 'Numéro de page invalide (1-604)', ar: 'رقم صفحة غير صالح (1-604)', en: 'Invalid page number (1-604)' },
  invalidJuz: { fr: 'Numéro de Juz invalide (1-30)', ar: 'رقم جزء غير صالح (1-30)', en: 'Invalid Juz number (1-30)' },
  openSurah: { fr: 'Ouverture de la sourate', ar: 'فتح السورة', en: 'Opening surah' },
  navToPage: { fr: 'Navigation vers page', ar: 'الانتقال إلى الصفحة', en: 'Navigating to page' },
  navToJuz: { fr: 'Navigation vers Juz', ar: 'الانتقال إلى الجزء', en: 'Navigating to Juz' },
  // Landing page
  landingTitle: { fr: 'Apprenons le Coran', ar: 'لنتعلم القرآن', en: 'Let us learn the Quran' },
  landingTagline: {
    fr: 'Application coranique accessible avec commandes vocales, récitation audio et mode hors-ligne.',
    ar: 'تطبيق قرآني متاح للجميع مع أوامر صوتية وتلاوة صوتية ووضع بدون إنترنت.',
    en: 'Accessible Quran app with voice commands, audio recitation and offline mode.',
  },
  openApp: { fr: "Ouvrir l'Application", ar: 'فتح التطبيق', en: 'Open the App' },
  installFree: { fr: 'Installer Gratuitement', ar: 'التثبيت مجاناً', en: 'Install for Free' },
  tryOnline: { fr: 'Essayer en Ligne', ar: 'جرب عبر الإنترنت', en: 'Try Online' },
  features: { fr: 'Fonctionnalités', ar: 'المميزات', en: 'Features' },
  featQuran: { fr: 'Coran Complet', ar: 'القرآن الكامل', en: 'Complete Quran' },
  featQuranDesc: {
    fr: '114 sourates avec texte arabe et traduction française',
    ar: '114 سورة مع النص العربي والترجمة',
    en: '114 surahs with Arabic text and translation',
  },
  featVoice: { fr: 'Commandes Vocales', ar: 'الأوامر الصوتية', en: 'Voice Commands' },
  featVoiceDesc: {
    fr: 'Navigation mains-libres pour une accessibilité totale',
    ar: 'تنقل بدون استخدام اليدين لوصول كامل',
    en: 'Hands-free navigation for full accessibility',
  },
  featAudio: { fr: 'Récitation Audio', ar: 'التلاوة الصوتية', en: 'Audio Recitation' },
  featAudioDesc: {
    fr: 'Écoutez les récitations par des récitateurs renommés',
    ar: 'استمع إلى التلاوات بأصوات قراء مشهورين',
    en: 'Listen to recitations by renowned reciters',
  },
  downloadApp: { fr: "Télécharger l'Application", ar: 'تحميل التطبيق', en: 'Download the App' },
  downloadAppSub: {
    fr: 'Installez l\'application sur votre appareil pour un accès rapide et hors-ligne',
    ar: 'ثبّت التطبيق على جهازك للوصول السريع وبدون إنترنت',
    en: 'Install the app on your device for quick, offline access',
  },
  computer: { fr: 'Ordinateur', ar: 'الحاسوب', en: 'Computer' },
  detailedInstructions: { fr: 'Instructions détaillées', ar: 'تعليمات مفصلة', en: 'Detailed instructions' },
  install: { fr: 'Installer', ar: 'تثبيت', en: 'Install' },
  stepOpenChrome: { fr: 'Ouvrez Chrome ou Edge', ar: 'افتح Chrome أو Edge', en: 'Open Chrome or Edge' },
  stepClickInstall: { fr: "Cliquez sur l'icône d'installation ⬇️", ar: 'انقر على أيقونة التثبيت ⬇️', en: 'Click the install icon ⬇️' },
  stepConfirmInstall: { fr: 'Confirmez "Installer"', ar: 'أكد "تثبيت"', en: 'Confirm "Install"' },
  stepOpenMenu: { fr: 'Ouvrez le menu ⋮', ar: 'افتح القائمة ⋮', en: 'Open the menu ⋮' },
  stepInstallApp: { fr: '"Installer l\'application"', ar: '"تثبيت التطبيق"', en: '"Install app"' },
  stepShare: { fr: 'Appuyez sur Partager ↗', ar: 'اضغط على مشاركة ↗', en: 'Tap Share ↗' },
  stepHomeScreen: { fr: '"Sur l\'écran d\'accueil"', ar: '"إلى الشاشة الرئيسية"', en: '"Add to Home Screen"' },
  stepAdd: { fr: 'Appuyez "Ajouter"', ar: 'اضغط "إضافة"', en: 'Tap "Add"' },
  offlineMode: { fr: 'Mode Hors-ligne', ar: 'وضع بدون إنترنت', en: 'Offline Mode' },
  fastLoading: { fr: 'Chargement Rapide', ar: 'تحميل سريع', en: 'Fast Loading' },
  free100: { fr: '100% Gratuit', ar: 'مجاني 100%', en: '100% Free' },
  secure: { fr: 'Sécurisé', ar: 'آمن', en: 'Secure' },
  footerRights: {
    fr: 'Application accessible pour tous',
    ar: 'تطبيق متاح للجميع',
    en: 'An accessible app for everyone',
  },
};

export const translate = (key: keyof typeof dict, lang: AppLang): string =>
  dict[key]?.[lang] ?? dict[key]?.fr ?? key;

export const useT = () => {
  const lang = useAppLang();
  return (key: keyof typeof dict) => translate(key, lang);
};
