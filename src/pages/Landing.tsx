import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, Monitor, Apple, BookOpen, Mic, Volume2, Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePwaInstall } from '@/contexts/PwaInstallContext';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/Header';

const Landing = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { deferredPrompt, isInstalled, install } = usePwaInstall();
  const { t } = useTranslation();

  const openApp = () => {
    // In some installed-PWA desktop contexts, client-side navigation can appear to do nothing.
    // A hard navigation to /app is more reliable.
    window.location.assign('/app');
  };

  useEffect(() => {
    // If the PWA launches on the marketing landing (e.g. old cached start_url),
    // immediately send users to the actual app experience.
    if (isInstalled) openApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInstalled]);

  const handleInstall = async () => {
    if (deferredPrompt) await install();
    else navigate('/install');
  };

  const features = [
    {
      icon: BookOpen,
      title: t('landing.feature1Title'),
      titleAr: 'القرآن الكامل',
      description: t('landing.feature1Desc')
    },
    {
      icon: Mic,
      title: t('landing.feature2Title'),
      titleAr: 'الأوامر الصوتية',
      description: t('landing.feature2Desc')
    },
    {
      icon: Volume2,
      title: t('landing.feature3Title'),
      titleAr: 'التلاوة الصوتية',
      description: t('landing.feature3Desc')
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Settings, Language and Install at the top from launch */}
      <Header />

      {/* Theme Toggle */}
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="fixed bottom-4 right-4 z-50 p-2 rounded-full bg-card border border-border shadow-lg"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      {/* Hero Section */}
      <section className="relative overflow-hidden pattern-islamic">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            {/* App Icon */}
            <div className="w-28 h-28 mx-auto mb-6 rounded-3xl overflow-hidden shadow-2xl border-4 border-primary/20 animate-scale-in">
              <img
                src="/pwa-512x512.png" 
                alt="Apprenons le Coran" 
                className="w-full h-full object-cover"
              />
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 animate-fade-in">
              {t('landing.title')}
            </h1>
            
            <p className="text-2xl md:text-3xl font-arabic text-primary mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              {t('landing.subtitle')}
            </p>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
              {t('landing.description')}
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
                  {t('common.openApp')}
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={handleInstall} 
                    size="lg" 
                    className="gap-2 text-lg px-8 py-6 shadow-lg"
                  >
                    <Download className="h-5 w-5" />
                    {t('landing.installFree')}
                  </Button>
                  <Button 
                    onClick={openApp}
                    variant="outline" 
                    size="lg" 
                    className="gap-2 text-lg px-8 py-6"
                  >
                    {t('landing.tryOnline')}
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
            {t('landing.features')}
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
                <h3 className="text-xl font-semibold text-foreground mb-1">{feature.title}</h3>
                <p className="text-primary font-arabic mb-3">{feature.titleAr}</p>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-4">
            {t('landing.downloadTitle')}
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            {t('landing.downloadDesc')}
          </p>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Desktop */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <Monitor className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{t('landing.desktop')}</h3>
                  <p className="text-sm text-muted-foreground">Windows / Mac / Linux</p>
                </div>
              </div>
              <ol className="space-y-2 text-sm text-foreground mb-4">
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  <span>Ouvrez Chrome ou Edge</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  <span>Cliquez sur l'icône d'installation ⬇️</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                  <span>Confirmez "Installer"</span>
                </li>
              </ol>
              <Button 
                onClick={() => navigate('/install')} 
                variant="outline" 
                className="w-full"
              >
                {t('landing.detailedInstructions')}
              </Button>
            </div>

            {/* Android */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Smartphone className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{t('landing.android')}</h3>
                  <p className="text-sm text-muted-foreground">Chrome</p>
                </div>
              </div>
              <ol className="space-y-2 text-sm text-foreground mb-4">
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  <span>Ouvrez le menu ⋮</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  <span>"Installer l'application"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                  <span>Confirmez "Installer"</span>
                </li>
              </ol>
              <Button 
                onClick={handleInstall} 
                className="w-full gap-2"
              >
                <Download className="h-4 w-4" />
                {t('common.install')}
              </Button>
            </div>

            {/* iOS */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <Apple className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{t('landing.ios')}</h3>
                  <p className="text-sm text-muted-foreground">Safari</p>
                </div>
              </div>
              <ol className="space-y-2 text-sm text-foreground mb-4">
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  <span>Appuyez sur Partager ↗</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  <span>"Sur l'écran d'accueil"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                  <span>Appuyez "Ajouter"</span>
                </li>
              </ol>
              <Button 
                onClick={() => navigate('/install')} 
                variant="outline" 
                className="w-full"
              >
                {t('landing.detailedInstructions')}
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
              <p className="text-sm font-medium text-foreground mt-2">{t('landing.offline')}</p>
            </div>
            <div>
              <span className="text-2xl">⚡</span>
              <p className="text-sm font-medium text-foreground mt-2">{t('landing.fastLoad')}</p>
            </div>
            <div>
              <span className="text-2xl">🆓</span>
              <p className="text-sm font-medium text-foreground mt-2">{t('landing.free')}</p>
            </div>
            <div>
              <span className="text-2xl">🔒</span>
              <p className="text-sm font-medium text-foreground mt-2">{t('landing.secure')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-sm">
            {t('landing.footer')}
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
