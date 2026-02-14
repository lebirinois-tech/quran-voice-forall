import { useEffect } from 'react';
import { usePwaInstall } from '@/contexts/PwaInstallContext';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, Monitor, Apple } from 'lucide-react';

const Install = () => {
  const { deferredPrompt, isInstalled, isIOS, isAndroid, isPreviewHost, install } = usePwaInstall();
  const publishedUrl = 'https://quran-voice-forall.lovable.app';

  const openApp = () => {
    // More reliable than client-side navigation in certain installed desktop PWA contexts.
    window.location.assign('/app');
  };

  useEffect(() => {
    // If user somehow lands on /install from an installed app, bring them into the app.
    if (isInstalled) openApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInstalled]);

  const handleInstall = async () => {
    await install();
  };

  const openPublished = () => {
    // In preview iframe, normal navigation to an external domain can be blocked.
    // Force a new tab/window to open.
    window.open(publishedUrl, '_blank', 'noopener,noreferrer');
  };

  const copyPublishedUrl = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(publishedUrl);
        return;
      }
    } catch {
      // ignore and fallback
    }
    window.prompt('Copiez ce lien :', publishedUrl);
  };

  return (
    <div className="min-h-screen bg-background pattern-islamic">
      <Header showBackButton onBack={() => window.location.assign('/')} />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-24 h-24 mx-auto mb-4 rounded-2xl overflow-hidden shadow-lg">
            <img src="/pwa-192x192.png" alt="Apprenons le Coran" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Installer l'Application
          </h1>
          <p className="text-muted-foreground">
            تثبيت التطبيق
          </p>
        </div>

        {isPreviewHost && (
          <div className="mb-6 rounded-xl border border-border bg-muted/30 p-4 text-sm">
            <p className="font-medium text-foreground">Remarque</p>
            <p className="text-muted-foreground">
              Dans la prévisualisation, le bouton/icone d’installation peut ne pas apparaître. Ouvre plutôt
              {" "}
              <a
                href={publishedUrl}
                className="underline underline-offset-4"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  // Ensure it opens even when the preview iframe blocks external navigation
                  e.preventDefault();
                  openPublished();
                }}
              >
                quran-voice-forall.lovable.app
              </a>
              {" "}
              dans Chrome ou Edge.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={openPublished}>
                Ouvrir le site
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={copyPublishedUrl}>
                Copier le lien
              </Button>
            </div>
          </div>
        )}

        {isInstalled ? (
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 text-center animate-scale-in">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Download className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Application déjà installée ! ✓
            </h2>
            <p className="text-muted-foreground mb-4">
              التطبيق مثبت بالفعل
            </p>
            <Button onClick={openApp} className="mt-2">
              Ouvrir l'application
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Direct Install Button (Chrome/Edge on Desktop/Android) */}
            {deferredPrompt && (
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 text-center animate-scale-in">
                <Button 
                  onClick={handleInstall} 
                  size="lg" 
                  className="gap-2 text-lg px-8 py-6"
                >
                  <Download className="h-6 w-6" />
                  Installer maintenant
                </Button>
                <p className="text-sm text-muted-foreground mt-3">
                  L'application sera ajoutée à votre écran d'accueil
                </p>
              </div>
            )}

            {/* iOS Instructions - All iPhone Models */}
            {isIOS && !deferredPrompt && (
              <div className="bg-card border border-border rounded-xl p-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                    <Apple className="h-6 w-6 text-gray-800 dark:text-gray-200" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">iPhone / iPad</h3>
                    <p className="text-sm text-muted-foreground">Tous les modèles</p>
                  </div>
                </div>

                {/* Safari Method - Primary */}
                <div className="mb-5">
                  <h4 className="font-medium text-foreground mb-2 text-sm flex items-center gap-2">
                    🌐 Méthode 1 : Safari (recommandé)
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Fonctionne sur tous les iPhone (iPhone 6 et +, iOS 11.3+)
                  </p>
                  <ol className="space-y-3 text-sm text-foreground" dir="ltr">
                    <li className="flex items-start gap-2">
                      <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                      <span>Ouvrez ce site dans <strong>Safari</strong> (obligatoire, pas Chrome ni Firefox)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                      <span>Appuyez sur le bouton <strong>Partager</strong> <span className="inline-block text-lg leading-none">⬆️</span> (carré avec flèche, en bas de l'écran)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                      <span>Faites défiler et appuyez sur <strong>"Sur l'écran d'accueil"</strong> (icône ➕)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">4</span>
                      <span>Appuyez sur <strong>"Ajouter"</strong> en haut à droite</span>
                    </li>
                  </ol>
                </div>

                {/* iOS 16.4+ with Chrome/Edge */}
                <div className="mb-5 pt-4 border-t border-border">
                  <h4 className="font-medium text-foreground mb-2 text-sm flex items-center gap-2">
                    📱 Méthode 2 : Chrome / Edge (iOS 16.4+)
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    iPhone 8 et + avec iOS 16.4 ou supérieur (2023+)
                  </p>
                  <ol className="space-y-3 text-sm text-foreground" dir="ltr">
                    <li className="flex items-start gap-2">
                      <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                      <span>Ouvrez ce site dans <strong>Chrome</strong> ou <strong>Edge</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                      <span>Appuyez sur le bouton <strong>Partager</strong> <span className="inline-block text-lg leading-none">⬆️</span></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                      <span>Appuyez sur <strong>"Ajouter à l'écran d'accueil"</strong></span>
                    </li>
                  </ol>
                </div>

                {/* Compatibility Info */}
                <div className="bg-muted/50 rounded-lg p-3 mt-3">
                  <h4 className="text-xs font-semibold text-foreground mb-2">📋 Compatibilité iPhone</h4>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <span className="text-primary shrink-0">✓</span>
                      <span><strong>iPhone 15/16 Pro Max</strong> — Safari ou Chrome (iOS 17/18)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary shrink-0">✓</span>
                      <span><strong>iPhone 12/13/14</strong> — Safari ou Chrome (iOS 16.4+)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary shrink-0">✓</span>
                      <span><strong>iPhone X/XR/XS/11</strong> — Safari recommandé</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary shrink-0">✓</span>
                      <span><strong>iPhone 6s/7/8/SE</strong> — Safari uniquement</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary shrink-0">✓</span>
                      <span><strong>iPad</strong> — Toutes versions avec Safari</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground/70 mt-2 italic">
                    💡 Sur iOS, utilisez toujours Safari pour la meilleure expérience hors-ligne.
                  </p>
                </div>
              </div>
            )}

            {/* Android Instructions */}
            {isAndroid && !deferredPrompt && (
              <div className="bg-card border border-border rounded-xl p-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Smartphone className="h-6 w-6 text-green-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Android</h3>
                    <p className="text-sm text-muted-foreground">Toutes versions</p>
                  </div>
                </div>

                <h4 className="font-medium text-foreground mb-2 text-sm">Méthode 1 : Chrome (recommandé)</h4>
                <ol className="space-y-3 text-sm text-foreground mb-5" dir="ltr">
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                    <span>Ouvrez ce site dans <strong>Chrome</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                    <span>Appuyez sur le menu <strong>⋮</strong> (trois points) en haut à droite</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                    <span>Appuyez sur <strong>"Installer l'application"</strong> ou <strong>"Ajouter à l'écran d'accueil"</strong></span>
                  </li>
                </ol>

                <h4 className="font-medium text-foreground mb-2 text-sm">Méthode 2 : Autres navigateurs (Samsung, Firefox…)</h4>
                <ol className="space-y-3 text-sm text-foreground mb-5" dir="ltr">
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                    <span>Ouvrez le menu du navigateur (⋮ ou ≡)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                    <span>Cherchez <strong>"Ajouter à l'écran d'accueil"</strong> ou <strong>"Installer"</strong></span>
                  </li>
                </ol>

                <h4 className="font-medium text-foreground mb-2 text-sm">Méthode 3 : Anciens Android (4.x – 7.x)</h4>
                <ol className="space-y-3 text-sm text-foreground" dir="ltr">
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                    <span>Ouvrez <strong>Chrome</strong> et accédez au site</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                    <span>Menu ⋮ → <strong>"Ajouter à l'écran d'accueil"</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                    <span>Un raccourci sera créé — l'appli s'ouvrira en plein écran</span>
                  </li>
                </ol>
              </div>
            )}

            {/* Desktop Instructions */}
            {!isIOS && !isAndroid && !deferredPrompt && (
              <div className="bg-card border border-border rounded-xl p-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Monitor className="h-6 w-6 text-blue-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Ordinateur</h3>
                    <p className="text-sm text-muted-foreground">Chrome / Edge</p>
                  </div>
                </div>
                <ol className="space-y-3 text-sm text-foreground" dir="ltr">
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                    <span>Cliquez sur l'icône <strong>d'installation</strong> dans la barre d'adresse (à droite)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                    <span>Ou cliquez sur le menu <strong>⋮</strong> → <strong>"Installer Quran Accès Pour Tous"</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                    <span>Confirmez en cliquant sur <strong>"Installer"</strong></span>
                  </li>
                </ol>
              </div>
            )}

            {/* Features */}
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
          </div>
        )}
      </main>
    </div>
  );
};

export default Install;
