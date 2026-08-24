import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { SurahCard } from '@/components/SurahCard';
import { VoiceCommandButton } from '@/components/VoiceCommandButton';
import { VoiceCommandHelp } from '@/components/VoiceCommandHelp';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAuth } from '@/hooks/useAuth';
import { useReadingProgress } from '@/hooks/useReadingProgress';
import { surahs, surahPageStart, juzMapping } from '@/data/surahs';
import { toast } from 'sonner';
import { Search, BookOpen, FileText, Layers, Download, User, LogIn, LogOut, History, RefreshCw, Music, RotateCcw, Smartphone, Apple } from 'lucide-react';
import { useUpdateCheck } from '@/components/UpdatePrompt';
import { BuildVersionBadge } from '@/components/BuildVersionBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { apkDownloadUrl } from '@/lib/apkDownload';
import { ipaDownloadUrl } from '@/lib/ipaDownload';

const Index = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [pageNumber, setPageNumber] = useState('');
  const [juzNumber, setJuzNumber] = useState('');
  const [isAccessibilityMode, setIsAccessibilityMode] = useState(false);
  const appSettings = useAppSettings();
  const { user, isAuthenticated, signOut, loading: authLoading } = useAuth();
  const { fetchProgress, getLastRead, progress } = useReadingProgress();
  const { isChecking, checkForUpdate } = useUpdateCheck();

  useEffect(() => {
    if (isAuthenticated) {
      fetchProgress();
    }
  }, [isAuthenticated, fetchProgress]);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Erreur lors de la déconnexion');
    } else {
      toast.success('Déconnexion réussie');
    }
  };

  const lastRead = getLastRead();
  const lastReadSurah = lastRead ? surahs.find(s => s.number === lastRead.surah_number) : null;

  const handleNavigateToSurah = (surahNumber: number) => {
    navigate(`/surah/${surahNumber}`);
    toast.success(`Ouverture de la sourate ${surahNumber}`);
  };

  const handleNavigateToPage = (pageNum: number) => {
    if (pageNum < 1 || pageNum > 604) {
      toast.error('Numéro de page invalide (1-604)');
      return;
    }
    
    // Find surah for this page
    const pageStartEntries = Object.entries(surahPageStart)
      .map(([surah, page]) => ({ surah: parseInt(surah), page }))
      .sort((a, b) => a.page - b.page);
    
    let targetSurah = 1;
    for (const entry of pageStartEntries) {
      if (entry.page <= pageNum) {
        targetSurah = entry.surah;
      } else {
        break;
      }
    }
    
    navigate(`/surah/${targetSurah}?page=${pageNum}`);
    toast.success(`Navigation vers page ${pageNum} (Sourate ${targetSurah})`);
  };

  const handleNavigateToJuz = (juzNum: number) => {
    const juz = juzMapping[juzNum];
    if (juz) {
      navigate(`/surah/${juz.surah}`);
      toast.success(`Navigation vers Juz ${juzNum} - ${juz.name}`);
    } else {
      toast.error('Numéro de Juz invalide (1-30)');
    }
  };

  const voiceCommands = useVoiceCommands({
    onNavigateToSurah: handleNavigateToSurah,
    onNavigateToPage: handleNavigateToPage,
    onNavigateToJuz: handleNavigateToJuz,
    onGoHome: () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  });

  const filteredSurahs = surahs.filter(surah => 
    surah.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    surah.nameArabic.includes(searchQuery) ||
    surah.englishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    surah.number.toString().includes(searchQuery)
  );

  return (
    <div className="min-h-screen pattern-islamic" style={{ backgroundColor: appSettings.backgroundColor }}>
      <Header 
        onAccessibilityToggle={() => setIsAccessibilityMode(!isAccessibilityMode)}
        isAccessibilityMode={isAccessibilityMode}
        reciter={appSettings.reciter}
        onReciterChange={appSettings.onReciterChange}
        backgroundColor={appSettings.backgroundColor}
        onBackgroundColorChange={appSettings.onBackgroundColorChange}
        textDisplayStyle={appSettings.textDisplayStyle}
        onTextDisplayStyleChange={appSettings.onTextDisplayStyleChange}
      />

      <main className="container mx-auto px-4 py-6">
        {/* Auth Section */}
        <section className="mb-6 flex items-center justify-between gap-3 animate-fade-in">
          <Link to="/reset">
            <Button variant="outline" size="sm" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Réinitialiser
            </Button>
          </Link>
          {authLoading ? (
            <div className="h-10 w-24 bg-muted animate-pulse rounded-lg" />
          ) : isAuthenticated ? (
            <div className="flex min-w-0 items-center gap-3">
              <span className="text-sm text-muted-foreground flex min-w-0 items-center gap-2 truncate">
                <User className="h-4 w-4" />
                {user?.email?.split('@')[0]}
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2">
                <LogOut className="h-4 w-4" />
                Déconnexion
              </Button>
            </div>
          ) : (
            <Link to="/auth">
              <Button variant="default" size="sm" className="gap-2">
                <LogIn className="h-4 w-4" />
                Connexion
              </Button>
            </Link>
          )}
        </section>

        {/* Continue Reading Section */}
        {isAuthenticated && lastReadSurah && (
          <section className="mb-6 animate-fade-in">
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    <History className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reprendre la lecture</p>
                    <p className="font-semibold text-foreground">
                      {lastReadSurah.name} - Verset {lastRead.verse_number}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => navigate(`/surah/${lastRead.surah_number}?verse=${lastRead.verse_number}`)}
                  size="sm"
                >
                  Continuer
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Hero Section */}
        <section className="text-center mb-8 animate-fade-in">
          <div className="inline-block p-4 rounded-full bg-primary/10 mb-4">
            <BookOpen className="h-12 w-12 text-primary" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Bienvenue dans le Saint Coran
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Lisez, écoutez et mémorisez le Coran avec des commandes vocales pour une accessibilité totale
          </p>
        </section>

        {/* Installation Section */}
        <section className="mb-8 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.05s' }}>
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4 text-center flex items-center justify-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              <span>Installer l'application <span className="text-sm font-normal text-muted-foreground">/ تثبيت التطبيق</span></span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* PWA Install */}
              <Link to="/install" className="block">
                <div className="bg-primary/10 hover:bg-primary/15 border border-primary/20 rounded-xl p-4 text-center transition-colors h-full flex flex-col items-center justify-center gap-2">
                  <Smartphone className="h-6 w-6 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground text-sm">PWA / Site</p>
                    <p className="text-xs text-muted-foreground">Installer sur téléphone</p>
                  </div>
                </div>
              </Link>
              {/* APK Download */}
              <a href={apkDownloadUrl} target="_blank" rel="noopener noreferrer" className="block">
                <div className="bg-secondary/10 hover:bg-secondary/15 border border-secondary/20 rounded-xl p-4 text-center transition-colors h-full flex flex-col items-center justify-center gap-2">
                  <Download className="h-6 w-6 text-secondary" />
                  <div>
                    <p className="font-semibold text-foreground text-sm">Android APK</p>
                    <p className="text-xs text-muted-foreground">Télécharger l'APK</p>
                  </div>
                </div>
              </a>
              {/* IPA Download */}
              <a href={ipaDownloadUrl} target="_blank" rel="noopener noreferrer" className="block">
                <div className="bg-accent/10 hover:bg-accent/15 border border-accent/20 rounded-xl p-4 text-center transition-colors h-full flex flex-col items-center justify-center gap-2">
                  <Apple className="h-6 w-6 text-accent" />
                  <div>
                    <p className="font-semibold text-foreground text-sm">iOS IPA</p>
                    <p className="text-xs text-muted-foreground">IPA non signé</p>
                  </div>
                </div>
              </a>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-3">
              L'APK s'installe directement sur Android. L'IPA nécessite une signature Apple Developer pour un iPhone physique.
            </p>
          </div>
        </section>

        {/* Mode de lecture : Versets / Pages */}
        <section className="mb-6 max-w-md mx-auto animate-fade-in">
          <div className="bg-card border border-border rounded-xl p-2 flex gap-2">
            <button
              type="button"
              onClick={() =>
                appSettings.onTextDisplayStyleChange(
                  appSettings.textDisplayStyle === 'pages-warsh'
                    ? 'warsh-tajweed'
                    : appSettings.textDisplayStyle === 'pages-qalun'
                      ? 'qalun-tajweed'
                      : 'tajweed'
                )
              }
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all',
                appSettings.textDisplayStyle.startsWith('pages-')
                  ? 'text-muted-foreground hover:bg-muted'
                  : 'bg-primary text-primary-foreground shadow'
              )}
              aria-pressed={!appSettings.textDisplayStyle.startsWith('pages-')}
            >
              <FileText className="h-4 w-4" />
              <span>Versets <span className="opacity-70 text-xs">/ آيات</span></span>
            </button>
            <button
              type="button"
              onClick={() => appSettings.onTextDisplayStyleChange('pages-hafs')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all',
                appSettings.textDisplayStyle.startsWith('pages-')
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:bg-muted'
              )}
              aria-pressed={appSettings.textDisplayStyle.startsWith('pages-')}
            >
              <BookOpen className="h-4 w-4" />
              <span>Pages <span className="opacity-70 text-xs">/ صفحات</span></span>
            </button>
          </div>

          {/* Riwaya : Hafs / Warsh / Qalun (Tajweed) — s'applique au mode choisi */}
          <div className="bg-card border border-border rounded-xl p-2 grid grid-cols-3 gap-2 mt-2">
            {([
              { key: 'hafs', label: 'Hafs', ar: 'حفص', verse: 'tajweed', page: 'pages-hafs' },
              { key: 'warsh', label: 'Warsh', ar: 'ورش', verse: 'warsh-tajweed', page: 'pages-warsh' },
              { key: 'qalun', label: 'Qalun', ar: 'قالون', verse: 'qalun-tajweed', page: 'pages-qalun' },
            ] as const).map((r) => {
              const isPages = appSettings.textDisplayStyle.startsWith('pages-');
              const target = isPages ? r.page : r.verse;
              const active = appSettings.textDisplayStyle === target;
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => appSettings.onTextDisplayStyleChange(target)}
                  aria-pressed={active}
                  className={cn(
                    'py-2.5 px-2 rounded-lg text-sm font-medium transition-all border',
                    active
                      ? 'bg-primary text-primary-foreground shadow border-primary'
                      : 'text-muted-foreground hover:bg-muted border-border'
                  )}
                >
                  <span className="block">{r.label}</span>
                  <span className="block text-xs opacity-70 font-amiri" dir="rtl">{r.ar} — تجويد</span>
                </button>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground text-center mt-2">
            Choisissez le mode d'affichage et la riwaya (Tajweed coloré dans les trois lectures)
          </p>
        </section>


        {/* Voice Command Section */}
        <section className="mb-8 flex flex-col items-center gap-4 animate-scale-in">
          <VoiceCommandButton
            isListening={voiceCommands.isListening}
            isSupported={voiceCommands.isSupported}
            onToggle={voiceCommands.toggleListening}
            transcript={voiceCommands.transcript}
            voiceLang={voiceCommands.voiceLang}
            onLangChange={voiceCommands.setVoiceLang}
          />
          
          {!voiceCommands.isSupported && (
            <p className="text-sm text-muted-foreground text-center">
              Les commandes vocales ne sont pas supportées par votre navigateur
            </p>
          )}
        </section>

        {/* Navigation by Page & Juz */}
        <section className="mb-6 max-w-lg mx-auto animate-fade-in" style={{ animationDelay: '0.05s' }}>
          <div className="grid grid-cols-2 gap-3">
            {/* Page Navigation */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Aller à la page</span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  max="604"
                  placeholder="1-604"
                  value={pageNumber}
                  onChange={(e) => setPageNumber(e.target.value)}
                  className="h-10 text-base bg-background"
                  aria-label="Numéro de page"
                />
                <Button 
                  onClick={() => {
                    const num = parseInt(pageNumber);
                    if (num) handleNavigateToPage(num);
                  }}
                  size="sm"
                  className="px-4"
                >
                  Go
                </Button>
              </div>
            </div>

            {/* Juz Navigation */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Aller au Juz</span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  max="30"
                  placeholder="1-30"
                  value={juzNumber}
                  onChange={(e) => setJuzNumber(e.target.value)}
                  className="h-10 text-base bg-background"
                  aria-label="Numéro de Juz"
                />
                <Button 
                  onClick={() => {
                    const num = parseInt(juzNumber);
                    if (num) handleNavigateToJuz(num);
                  }}
                  size="sm"
                  className="px-4"
                >
                  Go
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Search Bar */}
        <section className="mb-6 max-w-md mx-auto animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher une sourate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base bg-card border-border focus-accessible"
              aria-label="Rechercher une sourate"
            />
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-3 gap-4 mb-8 max-w-md mx-auto animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <div className="text-center p-4 bg-card rounded-xl border border-border">
            <p className="text-2xl font-bold text-primary">114</p>
            <p className="text-xs text-muted-foreground">Sourates</p>
          </div>
          <div className="text-center p-4 bg-card rounded-xl border border-border">
            <p className="text-2xl font-bold text-secondary">6236</p>
            <p className="text-xs text-muted-foreground">Versets</p>
          </div>
          <div className="text-center p-4 bg-card rounded-xl border border-border">
            <p className="text-2xl font-bold text-primary">604</p>
            <p className="text-xs text-muted-foreground">Pages</p>
          </div>
        </section>

        {/* Surah List */}
        <section className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="gold-underline">Liste des Sourates</span>
            <span className="text-sm font-normal text-muted-foreground">
              ({filteredSurahs.length})
            </span>
          </h3>
          
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredSurahs.map((surah, index) => (
              <div 
                key={surah.number}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <SurahCard
                  surah={surah}
                  onClick={() => handleNavigateToSurah(surah.number)}
                />
              </div>
            ))}
          </div>

          {filteredSurahs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Aucune sourate trouvée</p>
            </div>
          )}
        </section>

        {/* Voice Commands Help */}
        <section className="max-w-md mx-auto mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <VoiceCommandHelp voiceLang={voiceCommands.voiceLang} />
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-6 mt-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
            {/* Audio Library Button */}
            <Link to="/audio-library">
              <Button variant="outline" className="gap-2">
                <Music className="h-4 w-4" />
                Bibliothèque Audio
              </Button>
            </Link>
            {/* Install Button */}
            <Link to="/install">
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Installer l'application
              </Button>
            </Link>
            {/* APK Download Button */}
            <Button asChild variant="secondary" className="gap-2">
              <a href={apkDownloadUrl} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" />
                Télécharger l'APK
              </a>
            </Button>
            {/* Update Check Button */}
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={checkForUpdate}
              disabled={isChecking}
            >
              <RefreshCw className={cn("h-4 w-4", isChecking && "animate-spin")} />
              {isChecking ? 'Vérification...' : 'Rechercher une mise à jour'}
            </Button>
            {/* Reset Button */}
            <Link to="/reset">
              <Button variant="outline" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Réinitialiser l'application
              </Button>
            </Link>
          </div>
          
          <BuildVersionBadge className="mb-4" />

          <p className="text-sm text-muted-foreground">
            Quran Accès Pour Tous © {new Date().getFullYear()}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Le Saint Coran accessible à tous
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
