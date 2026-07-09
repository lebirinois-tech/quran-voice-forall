import { useEffect, useMemo, useState } from 'react';
import { usePwaInstall } from '@/contexts/PwaInstallContext';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, Monitor, Apple, CheckCircle2, Share, PlusSquare, ExternalLink } from 'lucide-react';
import { apkDownloadUrl } from '@/lib/apkDownload';

const Install = () => {
  const { deferredPrompt, isInstalled, isIOS, isAndroid, isPreviewHost, install } = usePwaInstall();
  const publishedUrl = 'https://quran-voice-forall.lovable.app';
  const [status, setStatus] = useState<string | null>(null);

  // On iOS, only Safari can install a PWA. Chrome/Firefox/Edge iOS all use WebKit
  // but do NOT expose the "Add to Home Screen" action — Apple restriction.
  const isIOSSafari = useMemo(() => {
    if (!isIOS) return false;
    const ua = navigator.userAgent;
    // Exclude Chrome/Firefox/Edge/Opera/Google app and common in-app browsers on iOS.
    return !/CriOS|FxiOS|EdgiOS|OPiOS|GSA|FBAN|FBAV|Instagram|Line|DuckDuckGo/i.test(ua);
  }, [isIOS]);

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
      // iOS install is manual — do nothing here, instructions are shown below.
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

  const copyPublishedForSafari = async () => {
    try {
      await navigator.clipboard.writeText(publishedUrl);
      setStatus('copied-ios');
    } catch {
      window.prompt('Copiez ce lien et ouvrez-le dans Safari :', publishedUrl);
    }
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
            <div className="bg-card border-2 border-secondary/40 rounded-xl p-6 text-center shadow-lg">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center">
                  <Smartphone className="h-6 w-6 text-secondary" />
                </div>
                <div className="text-left">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Téléchargement direct
                  </p>
                  <p className="font-semibold text-foreground">APK Android</p>
                </div>
              </div>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="gap-2 text-lg px-8 py-6 w-full sm:w-auto"
              >
                <a href={apkDownloadUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-6 w-6" />
                  Télécharger l'APK
                </a>
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                تحميل مباشر — Autorisez les sources inconnues sur Android.
              </p>
            </div>

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

              {platform === 'ios' ? (
                <div className="space-y-4">
                  {isIOSSafari ? (
                    <>
                      <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 text-left">
                        <p className="font-semibold text-foreground mb-3 text-center">
                          Installation iPhone avec Safari
                        </p>
                        <div className="space-y-3 text-sm text-foreground">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</span>
                            <span>Touchez le bouton <strong>Partager</strong> de Safari.</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</span>
                            <span>Choisissez <strong>Sur l'écran d'accueil</strong>.</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</span>
                            <span>Appuyez sur <strong>Ajouter</strong>.</span>
                          </div>
                        </div>
                      </div>
                      <Button onClick={openApp} size="lg" variant="outline" className="gap-2 text-lg px-8 py-6 w-full sm:w-auto">
                        <ExternalLink className="h-6 w-6" />
                        Ouvrir l'application
                      </Button>
                      <p className="text-sm text-muted-foreground">
                        Apple ne permet pas d'installer avec un bouton automatique comme Android.
                      </p>
                    </>
                  ) : (
                    <>
                      <Button onClick={copyPublishedForSafari} size="lg" className="gap-2 text-lg px-8 py-6 w-full sm:w-auto">
                        <Apple className="h-6 w-6" />
                        Copier le lien pour Safari
                      </Button>
                      <p className="text-sm text-muted-foreground">
                        Sur iPhone, ouvrez le lien dans <strong>Safari</strong>, puis Partager → Sur l'écran d'accueil → Ajouter.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <Button
                    onClick={handleInstall}
                    size="lg"
                    className="gap-2 text-lg px-8 py-6 w-full sm:w-auto"
                  >
                    <Download className="h-6 w-6" />
                    Installer maintenant
                  </Button>
                  <p className="text-sm text-muted-foreground mt-3">
                    {deferredPrompt
                      ? "L'invite d'installation va s'ouvrir automatiquement."
                      : "Ouvrez ce site dans Chrome ou Edge pour l'installer."}
                  </p>
                </>
              )}

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
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="gap-2 text-lg px-8 py-6 w-full sm:w-auto"
              >
                <a href={apkDownloadUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-6 w-6" />
                  Télécharger l'APK
                </a>
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                Build automatique depuis GitHub Releases. Autorisez l'installation depuis des sources inconnues sur votre Android.
              </p>
            </div>

            <div className="bg-card border border-secondary/30 rounded-xl p-6 text-center shadow-lg">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center">
                  <Apple className="h-6 w-6 text-secondary" />
                </div>
                <div className="text-left">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Application iPhone (IPA)
                  </p>
                  <p className="font-semibold text-foreground">تطبيق آيفون</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Apple n'autorise pas la distribution libre d'un fichier <strong>.ipa</strong> :
                il faut un compte Apple Developer (99 $/an), un Mac avec Xcode et une signature
                officielle. Sur iPhone, utilisez plutôt <strong>« Installer maintenant »</strong>
                ci-dessus : Safari → Partager ⬆️ → « Sur l'écran d'accueil ». L'app fonctionne
                ensuite comme une vraie application native.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Install;
