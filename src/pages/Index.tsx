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
import { Search, BookOpen, FileText, Layers, Download, User, LogIn, LogOut, History, RefreshCw, Music } from 'lucide-react';
import { useUpdateCheck } from '@/components/UpdatePrompt';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { apkDownloadUrl } from '@/lib/apkDownload';

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
        <section className="mb-6 flex justify-end animate-fade-in">
          {authLoading ? (
            <div className="h-10 w-24 bg-muted animate-pulse rounded-lg" />
          ) : isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
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
            <a href={apkDownloadUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" className="gap-2">
                <Download className="h-4 w-4" />
                Télécharger APK
              </Button>
            </a>
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
          </div>
          
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
