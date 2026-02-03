import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, Monitor, Apple, Chrome } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background pattern-islamic">
      <Header showBackButton onBack={() => navigate('/')} />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-24 h-24 mx-auto mb-4 rounded-2xl overflow-hidden shadow-lg">
            <img src="/pwa-192x192.png" alt="Quran pour tous" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Installer l'Application
          </h1>
          <p className="text-muted-foreground">
            تثبيت التطبيق
          </p>
        </div>

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
            <Button onClick={() => navigate('/')} className="mt-2">
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

            {/* iOS Instructions */}
            {isIOS && !deferredPrompt && (
              <div className="bg-card border border-border rounded-xl p-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <Apple className="h-6 w-6 text-gray-800" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">iPhone / iPad</h3>
                    <p className="text-sm text-muted-foreground">Safari</p>
                  </div>
                </div>
                <ol className="space-y-3 text-sm text-foreground" dir="ltr">
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                    <span>Appuyez sur le bouton <strong>Partager</strong> (icône carré avec flèche vers le haut)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                    <span>Faites défiler et appuyez sur <strong>"Sur l'écran d'accueil"</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                    <span>Appuyez sur <strong>"Ajouter"</strong> en haut à droite</span>
                  </li>
                </ol>
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
                    <p className="text-sm text-muted-foreground">Chrome</p>
                  </div>
                </div>
                <ol className="space-y-3 text-sm text-foreground" dir="ltr">
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                    <span>Appuyez sur le menu <strong>⋮</strong> (trois points) en haut à droite</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                    <span>Appuyez sur <strong>"Installer l'application"</strong> ou <strong>"Ajouter à l'écran d'accueil"</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                    <span>Confirmez en appuyant sur <strong>"Installer"</strong></span>
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
