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
  const [isDownloadingSurah, setIsDownloadingSurah] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const getCurrentSurahNumber = () => {
    const pathMatch = window.location.pathname.match(/\/surah\/(\d+)/);
    return pathMatch ? parseInt(pathMatch[1]) : null;
  };

  const handleDownloadSurah = async () => {
    const surahNumber = getCurrentSurahNumber();
    if (!surahNumber) {
      toast.info('Ouvrez une sourate pour télécharger son audio');
      return;
    }

    setIsDownloadingSurah(true);
    setDownloadProgress(0);
    
    try {
      const edition = RECITERS[reciter].id;
      const response = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/${edition}`);
      const data = await response.json();
      
      if (data.code === 200 && data.data?.ayahs) {
        const ayahs = data.data.ayahs;
        const surahName = data.data.englishName || `Surah-${surahNumber}`;
        
        // Download all verses
        for (let i = 0; i < ayahs.length; i++) {
          const ayah = ayahs[i];
          if (ayah?.audio) {
            const audioResponse = await fetch(ayah.audio);
            const blob = await audioResponse.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${surahName}_Verset_${ayah.numberInSurah}_${RECITERS[reciter].name}.mp3`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
          setDownloadProgress(Math.round(((i + 1) / ayahs.length) * 100));
          // Small delay to prevent browser blocking
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        toast.success(`Sourate ${surahName} téléchargée (${ayahs.length} versets)`);
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Erreur de téléchargement');
    } finally {
      setIsDownloadingSurah(false);
      setDownloadProgress(0);
    }
  };

  const handleOpenQuranDownloadLink = () => {
    // Open external link for full Quran download
    window.open(`https://quranicaudio.com/quran/${RECITERS[reciter].id}`, '_blank');
    toast.info('Redirection vers QuranicAudio pour le Quran complet');
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
      <DialogContent className="sm:max-w-md bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            Paramètres
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          {/* Reciter Selection */}
          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2 text-sm font-semibold">
              <Volume2 className="h-3.5 w-3.5 text-primary" />
              Récitateur
            </Label>
            <RadioGroup
              value={reciter}
              onValueChange={(value) => onReciterChange(value as ReciterId)}
              className="space-y-1"
            >
              {Object.entries(RECITERS).map(([key, { name }]) => (
                <div
                  key={key}
                  className="flex items-center space-x-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <RadioGroupItem value={key} id={`reciter-${key}`} className="h-3.5 w-3.5" />
                  <Label
                    htmlFor={`reciter-${key}`}
                    className="flex-1 cursor-pointer text-foreground text-sm"
                  >
                    {name}
                  </Label>
                  {reciter === key && <Check className="h-3.5 w-3.5 text-primary" />}
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Text Display Style */}
          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2 text-sm font-semibold">
              <Type className="h-3.5 w-3.5 text-primary" />
              Style d'affichage
            </Label>
            <RadioGroup
              value={textDisplayStyle}
              onValueChange={(value) => onTextDisplayStyleChange(value as TextDisplayStyle)}
              className="space-y-1"
            >
              {TEXT_DISPLAY_STYLES.map((style) => (
                <div
                  key={style.id}
                  className="flex items-center space-x-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <RadioGroupItem value={style.id} id={`style-${style.id}`} className="h-3.5 w-3.5" />
                  <Label
                    htmlFor={`style-${style.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{style.icon}</span>
                      <div>
                        <p className="text-foreground text-sm font-medium">{style.name}</p>
                        <p className="text-xs text-muted-foreground">{style.description}</p>
                      </div>
                    </div>
                  </Label>
                  {textDisplayStyle === style.id && <Check className="h-3.5 w-3.5 text-primary" />}
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Background Color */}
          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2 text-sm font-semibold">
              <Palette className="h-3.5 w-3.5 text-primary" />
              Couleur de fond
            </Label>
            <div className="grid grid-cols-3 gap-1.5">
              {BACKGROUND_COLORS.map((color) => (
                <button
                  key={color.id}
                  onClick={() => onBackgroundColorChange(color.value)}
                  className={`p-2 rounded-lg border-2 transition-all ${
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
          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2 text-sm font-semibold">
              <Download className="h-3.5 w-3.5 text-primary" />
              Télécharger l'audio
            </Label>
            <div className="space-y-1.5">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={handleDownloadSurah}
                disabled={isDownloadingSurah || !getCurrentSurahNumber()}
              >
                {isDownloadingSurah ? (
                  <>
                    <Download className="h-3.5 w-3.5 mr-2 animate-pulse" />
                    Téléchargement... {downloadProgress}%
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5 mr-2" />
                    📖 Télécharger la Sourate
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={handleOpenQuranDownloadLink}
              >
                <Download className="h-3.5 w-3.5 mr-2" />
                📚 Quran complet (lien externe)
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Avec le récitateur: {RECITERS[reciter].name}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
