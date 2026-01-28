import { useState } from 'react';
import { Settings, Volume2, Download, Palette, Check, Type, BookOpen } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { RECITERS, ReciterId } from '@/hooks/useQuranAudio';
import { TextDisplayStyle } from '@/hooks/useAppSettings';
import { toast } from 'sonner';

interface SettingsDialogProps {
  reciter: ReciterId;
  onReciterChange: (reciter: ReciterId) => void;
  backgroundColor: string;
  onBackgroundColorChange: (color: string) => void;
  textDisplayStyle: TextDisplayStyle;
  onTextDisplayStyleChange: (style: TextDisplayStyle) => void;
}

const BACKGROUND_COLORS = [
  { id: 'default', name: 'Crème (Défaut)', value: 'hsl(45, 30%, 96%)' },
  { id: 'white', name: 'Blanc', value: 'hsl(0, 0%, 100%)' },
  { id: 'sepia', name: 'Sépia', value: 'hsl(35, 40%, 90%)' },
  { id: 'dark', name: 'Sombre', value: 'hsl(150, 30%, 8%)' },
  { id: 'night', name: 'Nuit', value: 'hsl(220, 20%, 12%)' },
  { id: 'emerald-light', name: 'Émeraude clair', value: 'hsl(158, 30%, 95%)' },
];

const TEXT_DISPLAY_STYLES = [
  { 
    id: 'tajweed' as TextDisplayStyle, 
    name: 'Tajweed coloré', 
    description: 'Police Uthmanic avec couleurs Tajweed',
    icon: '🎨'
  },
  { 
    id: 'simple' as TextDisplayStyle, 
    name: 'Texte simple', 
    description: 'Texte arabe sans couleurs',
    icon: '📝'
  },
];

export const SettingsDialog = ({
  reciter,
  onReciterChange,
  backgroundColor,
  onBackgroundColorChange,
  textDisplayStyle,
  onTextDisplayStyleChange,
}: SettingsDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadFullSurah = async () => {
    setIsDownloading(true);
    try {
      // Get current surah from URL if on surah page
      const pathMatch = window.location.pathname.match(/\/surah\/(\d+)/);
      if (!pathMatch) {
        toast.info('Ouvrez une sourate pour télécharger son audio');
        return;
      }
      
      const surahNumber = parseInt(pathMatch[1]);
      const edition = RECITERS[reciter].id;
      
      // Fetch surah audio info
      const response = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/${edition}`);
      const data = await response.json();
      
      if (data.code === 200 && data.data?.ayahs) {
        // Download first verse as example (full surah download would be multiple files)
        const firstAyah = data.data.ayahs[0];
        if (firstAyah?.audio) {
          const audioResponse = await fetch(firstAyah.audio);
          const blob = await audioResponse.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `surah-${surahNumber}-verse-1-${reciter}.mp3`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success('Téléchargement du premier verset réussi');
        }
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Erreur de téléchargement');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-primary-foreground/10"
          aria-label="Paramètres"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Paramètres
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Reciter Selection */}
          <div className="space-y-3">
            <Label className="text-foreground flex items-center gap-2 text-base font-semibold">
              <Volume2 className="h-4 w-4 text-primary" />
              Récitateur
            </Label>
            <RadioGroup
              value={reciter}
              onValueChange={(value) => onReciterChange(value as ReciterId)}
              className="space-y-2"
            >
              {Object.entries(RECITERS).map(([key, { name }]) => (
                <div
                  key={key}
                  className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <RadioGroupItem value={key} id={`reciter-${key}`} />
                  <Label
                    htmlFor={`reciter-${key}`}
                    className="flex-1 cursor-pointer text-foreground"
                  >
                    {name}
                  </Label>
                  {reciter === key && <Check className="h-4 w-4 text-primary" />}
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Text Display Style */}
          <div className="space-y-3">
            <Label className="text-foreground flex items-center gap-2 text-base font-semibold">
              <Type className="h-4 w-4 text-primary" />
              Style d'affichage
            </Label>
            <RadioGroup
              value={textDisplayStyle}
              onValueChange={(value) => onTextDisplayStyleChange(value as TextDisplayStyle)}
              className="space-y-2"
            >
              {TEXT_DISPLAY_STYLES.map((style) => (
                <div
                  key={style.id}
                  className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <RadioGroupItem value={style.id} id={`style-${style.id}`} />
                  <Label
                    htmlFor={`style-${style.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{style.icon}</span>
                      <div>
                        <p className="text-foreground font-medium">{style.name}</p>
                        <p className="text-xs text-muted-foreground">{style.description}</p>
                      </div>
                    </div>
                  </Label>
                  {textDisplayStyle === style.id && <Check className="h-4 w-4 text-primary" />}
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Background Color */}
          <div className="space-y-3">
            <Label className="text-foreground flex items-center gap-2 text-base font-semibold">
              <Palette className="h-4 w-4 text-primary" />
              Couleur de fond
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {BACKGROUND_COLORS.map((color) => (
                <button
                  key={color.id}
                  onClick={() => onBackgroundColorChange(color.value)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    backgroundColor === color.value
                      ? 'border-primary ring-2 ring-primary/30'
                      : 'border-border hover:border-primary/50'
                  }`}
                  style={{ backgroundColor: color.value }}
                  aria-label={color.name}
                >
                  <span
                    className={`text-xs font-medium ${
                      color.id === 'dark' || color.id === 'night'
                        ? 'text-white'
                        : 'text-foreground'
                    }`}
                  >
                    {color.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Download Audio */}
          <div className="space-y-3">
            <Label className="text-foreground flex items-center gap-2 text-base font-semibold">
              <Download className="h-4 w-4 text-primary" />
              Télécharger l'audio
            </Label>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleDownloadFullSurah}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <>Téléchargement...</>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger le verset actuel
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Télécharge l'audio du verset en cours avec le récitateur sélectionné
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
