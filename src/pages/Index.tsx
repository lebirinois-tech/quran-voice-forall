import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { SurahCard } from '@/components/SurahCard';
import { VoiceCommandButton } from '@/components/VoiceCommandButton';
import { VoiceCommandHelp } from '@/components/VoiceCommandHelp';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { surahs } from '@/data/surahs';
import { toast } from 'sonner';
import { Search, BookOpen, Mic } from 'lucide-react';
import { Input } from '@/components/ui/input';

const Index = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAccessibilityMode, setIsAccessibilityMode] = useState(false);

  const handleNavigateToSurah = (surahNumber: number) => {
    navigate(`/surah/${surahNumber}`);
    toast.success(`Ouverture de la sourate ${surahNumber}`);
  };

  const voiceCommands = useVoiceCommands({
    onNavigateToSurah: handleNavigateToSurah,
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
    <div className="min-h-screen bg-background pattern-islamic">
      <Header 
        onAccessibilityToggle={() => setIsAccessibilityMode(!isAccessibilityMode)}
        isAccessibilityMode={isAccessibilityMode}
      />

      <main className="container mx-auto px-4 py-6">
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
          />
          
          {!voiceCommands.isSupported && (
            <p className="text-sm text-muted-foreground text-center">
              Les commandes vocales ne sont pas supportées par votre navigateur
            </p>
          )}
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
            <p className="text-2xl font-bold text-primary">30</p>
            <p className="text-xs text-muted-foreground">Juz</p>
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
          <VoiceCommandHelp />
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-6 mt-8">
        <div className="container mx-auto px-4 text-center">
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
