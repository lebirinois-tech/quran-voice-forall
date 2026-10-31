import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, Monitor, Apple, BookOpen, Mic, Volume2, Moon, Sun, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { usePwaInstall } from '@/contexts/PwaInstallContext';
import { SettingsDialog } from '@/components/SettingsDialog';
import { AppLangSwitcher } from '@/components/AppLangSwitcher';
import { useUpdateCheck } from '@/components/UpdatePrompt';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useT } from '@/lib/i18n';

const Landing = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const appSettings = useAppSettings();
  const t = useT();
  const { isChecking, checkForUpdate } = useUpdateCheck();
  const { deferredPrompt, isInstalled, isIOS, install } = usePwaInstall();

  // Sur l'APK natif (Capacitor) ou en mode standalone installé, on ouvre
  // directement l'application au lieu d'afficher la page d'installation.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
    const isCapacitor =
      !!w.Capacitor?.isNativePlatform?.() ||
      window.location.protocol === 'capacitor:' ||
      (window.location.protocol === 'https:' && window.location.hostname === 'localhost');
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      // iOS Safari standalone
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isCapacitor || isStandalone) {
      window.location.replace('/app');
    }
  }, []);

  const openApp = () => {
    // In some installed-PWA desktop contexts, client-side navigation can appear to do nothing.
    // A hard navigation to /app is more reliable.
    window.location.assign('/app');
  };

  const handleInstall = async () => {
    if (isIOS || deferredPrompt) await install();
    else navigate('/install');
  };

  const features = [
    { icon: BookOpen, k: 'featQuran' as const, dk: 'featQuranDesc' as const },
    { icon: Mic, k: 'featVoice' as const, dk: 'featVoiceDesc' as const },
    { icon: Volume2, k: 'featAudio' as const, dk: 'featAudioDesc' as const },
  ];

  return (
    <div className="min-h-screen bg-background">

      {/* Hero Section */}
      <section className="relative overflow-hidden pattern-islamic">
        <div className="container mx-auto px-4 pt-5 pb-16 md:pt-8 md:pb-24">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="whitespace-nowrap font-bold font-arabic text-primary mb-4 animate-fade-in text-[clamp(1.4rem,7vw,3rem)]" dir="rtl">
              القرآن الكريم للجميع
            </h1>

            {/* Controls: settings, language, update, theme */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="rounded-full bg-gradient-islamic shadow-sm">
                <SettingsDialog
                  reciter={appSettings.reciter}
                  onReciterChange={appSettings.onReciterChange}
                  backgroundColor={appSettings.backgroundColor}
                  onBackgroundColorChange={appSettings.onBackgroundColorChange}
                  textDisplayStyle={appSettings.textDisplayStyle}
                  onTextDisplayStyleChange={appSettings.onTextDisplayStyleChange}
                  fontSize={appSettings.fontSize}
                  onFontSizeChange={appSettings.onFontSizeChange}
                />
              </div>
              <AppLangSwitcher className="bg-card border border-border shadow-sm text-foreground" />
              <Button
                variant="outline"
                size="sm"
                onClick={checkForUpdate}
                disabled={isChecking}
                className="gap-1 rounded-full shadow-sm"
                aria-label={t('updateCheck')}
              >
                <RefreshCw className={isChecking ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                <span className="hidden sm:inline">{t('updateCheck')}</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="rounded-full shadow-sm"
                aria-label={t('toggleTheme')}
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            </div>

            {/* App Icon */}

            <div className="w-28 h-28 mx-auto mb-6 rounded-3xl overflow-hidden shadow-2xl border-4 border-primary/20 animate-scale-in">
              <img
                src="/pwa-512x512.png" 
                alt="القرآن الكريم للجميع" 
                className="w-full h-full object-cover"
              />
            </div>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
              {t('landingTagline')}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              {isInstalled ? (
                <Button 
                  onClick={openApp}
                  size="lg" 
                  className="gap-2 text-lg px-8 py-6"
                >
                  <BookOpen className="h-5 w-5" />
                  {t('openApp')}
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={handleInstall} 
                    size="lg" 
                    className="gap-2 text-lg px-8 py-6 shadow-lg"
                  >
                    <Download className="h-5 w-5" />
                    {t('installFree')}
                  </Button>
                  <Button 
                    onClick={openApp}
                    variant="outline" 
                    size="lg" 
                    className="gap-2 text-lg px-8 py-6"
                  >
                    {t('tryOnline')}
                  </Button>
                </>
              )}
            </div>

            {/* Platform badges */}
            <div className="flex flex-wrap gap-3 justify-center text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <span className="flex items-center gap-1.5 bg-card px-3 py-1.5 rounded-full border border-border">
                <Monitor className="h-4 w-4" /> Windows / Mac
              </span>
              <span className="flex items-center gap-1.5 bg-card px-3 py-1.5 rounded-full border border-border">
                <Smartphone className="h-4 w-4" /> Android
              </span>
              <span className="flex items-center gap-1.5 bg-card px-3 py-1.5 rounded-full border border-border">
                <Apple className="h-4 w-4" /> iPhone / iPad
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">
            {t('features')}
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-card border border-border rounded-2xl p-6 text-center hover:shadow-lg transition-shadow animate-fade-in"
                style={{ animationDelay: `${0.1 * index}s` }}
              >
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-1">{t(feature.k)}</h3>
                <p className="text-primary font-arabic mb-3">{t.alt(feature.k)}</p>
                <p className="text-muted-foreground">{t(feature.dk)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-4">
            {t('downloadApp')}
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            {t('downloadAppSub')}
          </p>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Desktop */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <Monitor className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{t('computer')}</h3>
                  <p className="text-sm text-muted-foreground">Windows / Mac / Linux</p>
                </div>
              </div>
              <ol className="space-y-2 text-sm text-foreground mb-4">
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  <span>{t('stepOpenChrome')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  <span>{t('stepClickInstall')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                  <span>{t('stepConfirmInstall')}</span>
                </li>
              </ol>
              <Button 
                onClick={() => navigate('/install')} 
                variant="outline" 
                className="w-full"
              >
                {t('detailedInstructions')}
              </Button>
            </div>

            {/* Android */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Smartphone className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Android</h3>
                  <p className="text-sm text-muted-foreground">Chrome</p>
                </div>
              </div>
              <ol className="space-y-2 text-sm text-foreground mb-4">
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  <span>{t('stepOpenMenu')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  <span>{t('stepInstallApp')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                  <span>{t('stepConfirmInstall')}</span>
                </li>
              </ol>
              <Button 
                onClick={handleInstall} 
                className="w-full gap-2"
              >
                <Download className="h-4 w-4" />
                {t('install')}
              </Button>
            </div>

            {/* iOS */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <Apple className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">iPhone / iPad</h3>
                  <p className="text-sm text-muted-foreground">Safari</p>
                </div>
              </div>
              <ol className="space-y-2 text-sm text-foreground mb-4">
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  <span>{t('stepShare')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  <span>{t('stepHomeScreen')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                  <span>{t('stepAdd')}</span>
                </li>
              </ol>
              <Button 
                onClick={() => navigate('/install')} 
                variant="outline" 
                className="w-full"
              >
                {t('detailedInstructions')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-12 bg-primary/5">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto text-center">
            <div>
              <span className="text-2xl">📴</span>
              <p className="text-sm font-medium text-foreground mt-2">{t('offlineMode')}</p>
            </div>
            <div>
              <span className="text-2xl">⚡</span>
              <p className="text-sm font-medium text-foreground mt-2">{t('fastLoading')}</p>
            </div>
            <div>
              <span className="text-2xl">🆓</span>
              <p className="text-sm font-medium text-foreground mt-2">{t('free100')}</p>
            </div>
            <div>
              <span className="text-2xl">🔒</span>
              <p className="text-sm font-medium text-foreground mt-2">{t('secure')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} {t('landingTitle')} - {t('footerRights')}
          </p>
          <p className="text-primary font-arabic mt-2">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
