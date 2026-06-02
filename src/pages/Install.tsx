import { useEffect, useMemo, useState } from 'react';
import { usePwaInstall } from '@/contexts/PwaInstallContext';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, Monitor, Apple, CheckCircle2 } from 'lucide-react';
import { apkDownloadUrl } from '@/lib/apkDownload';

const Install = () => {
  const { deferredPrompt, isInstalled, isIOS, isAndroid, isPreviewHost, install } = usePwaInstall();
  const publishedUrl = 'https://quran-voice-forall.lovable.app';
  const [status, setStatus] = useState<string | null>(null);

  const platform: 'ios' | 'android' | 'desktop' = useMemo(() => {
    if (isIOS) return 'ios';
    if (isAndroid) return 'android';
    return 'desktop';
  }, [isIOS, isAndroid]);

  const platformLabel =
    platform === 'ios'
      ? 'iPhone / iPad'
      : platform === 'android'
        ? 'Android'
        : 'Windows / Ordinateur';
  const PlatformIcon = platform === 'ios' ? Apple : platform === 'android' ? Smartphone : Monitor;

  const openApp = () => {
    window.location.assign('/app');
  };

  useEffect(() => {
    if (isInstalled) openApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInstalled]);

  // Auto-trigger native install prompt as soon as it becomes available
  useEffect(() => {
    if (deferredPrompt && !isInstalled) {
      install().then((outcome) => {
        if (outcome === 'accepted') setStatus('installed');
        else if (outcome === 'dismissed') setStatus('dismissed');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredPrompt]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      const outcome = await install();
      if (outcome === 'accepted') setStatus('installed');
      else if (outcome === 'dismissed') setStatus('dismissed');
      return;
    }
    if (platform === 'ios') {
      try {
        if ((navigator as any).share) {
          await (navigator as any).share({ title: "Apprenons le Coran", url: publishedUrl });
          setStatus('shared-ios');
          return;
        }
      } catch {
        /* cancelled */
      }
      try {
        await navigator.clipboard.writeText(publishedUrl);
        setStatus('copied-ios');
      } catch {
        window.prompt('Copiez ce lien et ouvrez-le dans Safari :', publishedUrl);
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(publishedUrl);
      setStatus('copied');
    } catch {
      window.prompt('Copiez ce lien dans Chrome / Edge :', publishedUrl);
    }
  };

  const openPublished = () => {
    window.open(publishedUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-background pattern-islamic">
      <Header showBackButton onBack={() => window.location.assign('/')} />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-24 h-24 mx-auto mb-4 rounded-2xl overflow-hidden shadow-lg">
            <img src="/pwa-192x192.png" alt="Apprenons le Coran" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Installer l'Application</h1>
          <p className="text-muted-foreground">تثبيت التطبيق</p>
        </div>

        {isInstalled ? (
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 text-center animate-scale-in">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Application déjà installée ! ✓</h2>
            <p className="text-muted-foreground mb-4">التطبيق مثبت بالفعل</p>
            <Button onClick={openApp} className="mt-2">Ouvrir l'application</Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-card border border-primary/30 rounded-xl p-6 text-center animate-scale-in shadow-lg">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <PlatformIcon className="h-6 w-6 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Détecté automatiquement
                  </p>
                  <p className="font-semibold text-foreground">{platformLabel}</p>
                </div>
              </div>

              <Button
                onClick={handleInstall}
                size="lg"
                className="gap-2 text-lg px-8 py-6 w-full sm:w-auto"
              >
                <Download className="h-6 w-6" />
                Installer maintenant
              </Button>

              <p className="text-sm text-muted-foreground mt-3">
                {platform === 'ios'
                  ? "Sur iOS, appuyez sur Partager ⬆️ puis « Sur l'écran d'accueil »."
                  : deferredPrompt
                    ? "L'invite d'installation va s'ouvrir automatiquement."
                    : "Ouvrez ce site dans Chrome ou Edge pour l'installer."}
              </p>

              {status === 'installed' && (
                <p className="text-sm text-primary mt-3 font-medium">✓ Installation lancée</p>
              )}
              {status === 'dismissed' && (
                <p className="text-sm text-muted-foreground mt-3">
                  Installation annulée. Vous pouvez réessayer.
                </p>
              )}
              {status === 'copied' && (
                <p className="text-sm text-primary mt-3 font-medium">
                  ✓ Lien copié — collez-le dans Chrome / Edge
                </p>
              )}
              {status === 'copied-ios' && (
                <p className="text-sm text-primary mt-3 font-medium">
                  ✓ Lien copié — ouvrez Safari et collez-le
                </p>
              )}
              {status === 'shared-ios' && (
                <p className="text-sm text-primary mt-3 font-medium">
                  ✓ Choisissez « Sur l'écran d'accueil »
                </p>
              )}

              {isPreviewHost && (
                <div className="mt-4 text-xs text-muted-foreground">
                  En prévisualisation ?{' '}
                  <button onClick={openPublished} className="underline underline-offset-4">
                    ouvrir le site publié
                  </button>
                </div>
              )}
            </div>

            <div className="bg-muted/30 rounded-xl p-6">
              <h3 className="font-semibold text-foreground mb-4 text-center">
                Avantages de l'installation
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  <span>Accès hors-ligne</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  <span>Chargement rapide</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  <span>Plein écran</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  <span>Icône sur l'écran</span>
                </div>
              </div>
            </div>

            {/* Téléchargement APK Android natif */}
            <div className="bg-card border border-secondary/30 rounded-xl p-6 text-center shadow-lg">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center">
                  <Smartphone className="h-6 w-6 text-secondary" />
                </div>
                <div className="text-left">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Application Android (APK)
                  </p>
                  <p className="font-semibold text-foreground">تطبيق أندرويد</p>
                </div>
              </div>

              <a
                href={apkDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block w-full sm:w-auto"
              >
                <Button
                  variant="secondary"
                  size="lg"
                  className="gap-2 text-lg px-8 py-6 w-full sm:w-auto"
                >
                  <Download className="h-6 w-6" />
                  Télécharger l'APK Android
                </Button>
              </a>

              <p className="text-sm text-muted-foreground mt-3">
                Version native Android — installation directe sans Play Store.
                <br />
                <span className="text-xs">
                  (Autorisez « Sources inconnues » dans les paramètres Android avant l'installation)
                </span>
                <br />
                <span className="text-xs text-primary font-medium">
                  ✓ Téléchargement libre — aucune connexion requise
                </span>
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Install;
