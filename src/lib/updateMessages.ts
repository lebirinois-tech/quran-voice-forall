import { getAppLang } from './i18n';

const messages = {
  available: { fr: 'Nouvelle version Android disponible', ar: 'تتوفر نسخة أندرويد جديدة', en: 'New Android version available' },
  install: { fr: 'Télécharger la mise à jour', ar: 'تحميل التحديث', en: 'Download update' },
  tapToDownload: { fr: 'Nouvelle version disponible. Touchez « Télécharger » puis acceptez l’installation.', ar: 'تحديث جديد متوفر. اضغطوا «تحميل» ثم اقبلوا التثبيت.', en: 'New version available. Tap “Download”, then accept the installation.' },
  autoDownload: { fr: 'Téléchargement automatique lancé. Acceptez l’installation sur votre téléphone.', ar: 'جارٍ تحميل التحديث تلقائياُ. اقبلوا التثبيت على هاتفكم.', en: 'Automatic download started. Accept the installation on your phone.' },
  current: { fr: 'L’application est à jour', ar: 'التطبيق محدّث', en: 'The app is up to date' },
  unavailable: { fr: 'Vérification indisponible. Réessayez avec une connexion Internet.', ar: 'تعذر التحقق. أعد المحاولة مع اتصال بالإنترنت.', en: 'Cannot check. Try again with an Internet connection.' },
  webAvailable: { fr: 'Nouvelle version détectée, actualisation en cours', ar: 'نسخة جديدة، جارٍ التحديث', en: 'New version detected, updating' },
  downloadFailed: { fr: 'Impossible d’ouvrir le téléchargement. Réessayez.', ar: 'تعذر فتح التحميل. أعد المحاولة.', en: 'Cannot open download. Try again.' },
};

export const updateMessage = (key: keyof typeof messages) => messages[key][getAppLang()];
