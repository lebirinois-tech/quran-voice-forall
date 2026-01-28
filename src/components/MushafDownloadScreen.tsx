import { useEffect } from 'react';
import { Loader2, Download, CheckCircle, AlertCircle, BookOpen } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { useMushafDownload } from '@/hooks/useMushafDownload';

interface MushafDownloadScreenProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export const MushafDownloadScreen = ({ onComplete, onSkip }: MushafDownloadScreenProps) => {
  const {
    isDownloading,
    isComplete,
    progress,
    downloadedCount,
    totalPages,
    error,
    startDownload
  } = useMushafDownload();

  useEffect(() => {
    if (isComplete) {
      // Small delay to show completion state
      const timer = setTimeout(onComplete, 1000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, onComplete]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl border border-border p-8 shadow-lg">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Mushaf Tajweed
          </h1>
          <p className="text-muted-foreground">
            Téléchargement des pages du Coran Tajweed coloré pour une utilisation hors-ligne
          </p>
        </div>

        {!isDownloading && !isComplete && !error && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p className="mb-2">Ce téléchargement initial va :</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Télécharger 604 pages du Mushaf</li>
                <li>Stocker les images pour usage hors-ligne</li>
                <li>Prendre environ 5-10 minutes</li>
              </ul>
            </div>
            
            <Button 
              onClick={startDownload}
              className="w-full"
              size="lg"
            >
              <Download className="h-5 w-5 mr-2" />
              Commencer le téléchargement
            </Button>

            {onSkip && (
              <Button 
                onClick={onSkip}
                variant="ghost"
                className="w-full"
              >
                Passer (utiliser le chargement en ligne)
              </Button>
            )}
          </div>
        )}

        {isDownloading && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 text-primary">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="font-medium">Téléchargement en cours...</span>
            </div>
            
            <Progress value={progress} className="h-3" />
            
            <p className="text-center text-sm text-muted-foreground">
              {downloadedCount} / {totalPages} pages téléchargées
            </p>
            
            <p className="text-center text-xs text-muted-foreground">
              Veuillez ne pas fermer l'application
            </p>
          </div>
        )}

        {isComplete && (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className="h-8 w-8" />
            </div>
            <p className="font-medium text-foreground">
              Téléchargement terminé !
            </p>
            <p className="text-sm text-muted-foreground">
              Les pages du Mushaf sont maintenant disponibles hors-ligne
            </p>
          </div>
        )}

        {error && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-destructive">
              <AlertCircle className="h-6 w-6" />
              <span className="font-medium">Erreur</span>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {error}
            </p>
            <Button onClick={startDownload} className="w-full">
              Réessayer
            </Button>
            {onSkip && (
              <Button onClick={onSkip} variant="ghost" className="w-full">
                Continuer sans téléchargement
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
