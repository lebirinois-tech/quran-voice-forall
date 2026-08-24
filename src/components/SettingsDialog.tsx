import { useState } from 'react';
import { Settings, Volume2, Download, Palette, Check, Type, TextCursor } from 'lucide-react';
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
import { RECITERS, RECITER_IDS, QIRAAT_LABELS, ReciterId, QiraatId, getSafeReciter } from '@/hooks/useQuranAudio';
import { TextDisplayStyle, FontSize, VerseViewMode } from '@/hooks/useAppSettings';
import { AudioCacheSettings } from './AudioCacheSettings';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SettingsDialogProps {
  reciter: ReciterId;
  onReciterChange: (reciter: ReciterId) => void;
  backgroundColor: string;
  onBackgroundColorChange: (color: string) => void;
  textDisplayStyle: TextDisplayStyle;
  onTextDisplayStyleChange: (style: TextDisplayStyle) => void;
  fontSize: FontSize;
  onFontSizeChange: (size: FontSize) => void;
  verseViewMode?: VerseViewMode;
  onVerseViewModeChange?: (mode: VerseViewMode) => void;
  triggerClassName?: string;
  triggerLabel?: string;
}

const BACKGROUND_COLORS = [
  { id: 'default', name: 'Crème / كريمي', value: 'hsl(45, 30%, 96%)' },
  { id: 'white', name: 'Blanc / أبيض', value: 'hsl(0, 0%, 100%)' },
  { id: 'sepia', name: 'Sépia / بني داكن', value: 'hsl(35, 40%, 90%)' },
  { id: 'dark', name: 'Sombre / داكن', value: 'hsl(150, 30%, 8%)' },
  { id: 'night', name: 'Nuit / ليلي', value: 'hsl(220, 20%, 12%)' },
  { id: 'emerald-light', name: 'Émeraude / زمردي', value: 'hsl(158, 30%, 95%)' },
];

const TEXT_DISPLAY_STYLES = [
  { 
    id: 'tajweed' as TextDisplayStyle, 
    name: 'Hafs Tajweed (verset) / حفص تجويد', 
    description: 'Texte Hafs coloré verset par verset',
    icon: '🎨'
  },
  { 
    id: 'warsh-tajweed' as TextDisplayStyle, 
    name: 'Warsh Tajweed (verset) / ورش تجويد', 
    description: 'Texte Warsh verset par verset avec Tajweed coloré',
    icon: '🕌'
  },
  {
    id: 'qalun-tajweed' as TextDisplayStyle,
    name: 'Qalun Tajweed (verset) / قالون تجويد',
    description: 'Texte Qalun verset par verset avec Tajweed coloré',
    icon: '🟢'
  },
  { 
    id: 'pages-hafs' as TextDisplayStyle, 
    name: 'Mushaf Hafs (pages) / مصحف حفص', 
    description: 'Mushaf Hafs Tajweed page par page — hors ligne',
    icon: '📖'
  },
  { 
    id: 'pages-warsh' as TextDisplayStyle, 
    name: 'Mushaf Warsh (pages) / مصحف ورش', 
    description: 'Mushaf Warsh Tajweed page par page — hors ligne',
    icon: '📜'
  },
  { 
    id: 'pages-qalun' as TextDisplayStyle, 
    name: 'Mushaf Qalun (pages) / مصحف قالون', 
    description: 'Mushaf Qalun Tajweed page par page — hors ligne',
    icon: '📗'
  },
];

const FONT_SIZES = [
  { id: 'small' as FontSize, name: 'Petit / صغير', size: 'text-2xl' },
  { id: 'medium' as FontSize, name: 'Moyen / متوسط', size: 'text-3xl' },
  { id: 'large' as FontSize, name: 'Grand / كبير', size: 'text-4xl' },
  { id: 'xlarge' as FontSize, name: 'Très grand / كبير جداً', size: 'text-5xl' },
];

export const SettingsDialog = ({
  reciter,
  onReciterChange,
  backgroundColor,
  onBackgroundColorChange,
  textDisplayStyle,
  onTextDisplayStyleChange,
  fontSize,
  onFontSizeChange,
  verseViewMode,
  onVerseViewModeChange,
  triggerClassName,
  triggerLabel,
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
      const edition = RECITERS[reciter]?.id ?? 'ar.husary';
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
            a.download = `${surahName}_Verset_${ayah.numberInSurah}_${RECITERS[reciter]?.name ?? reciter}.mp3`;
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
    // Open external link for full Quran download using correct QuranicAudio ID
    const quranicAudioId = RECITERS[reciter]?.quranicAudioId ?? 18;
    window.open(`https://quranicaudio.com/quran/${quranicAudioId}`, '_blank');
    toast.info('Redirection vers QuranicAudio pour le Quran complet');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size={triggerLabel ? 'default' : 'icon'}
          className={cn('text-primary-foreground hover:bg-primary-foreground/10', triggerClassName)}
          aria-label="Paramètres"
        >
          <Settings className="h-5 w-5" />
          {triggerLabel && <span>{triggerLabel}</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="z-[120] sm:max-w-md bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            Paramètres / الإعدادات
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          {/* Récitateur — automatique selon la riwaya affichée */}
          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2 text-sm font-semibold">
              <Volume2 className="h-3.5 w-3.5 text-primary" />
              Récitateur / القارئ
            </Label>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm text-foreground">
                {RECITERS[getSafeReciter(reciter)].name} /{' '}
                <span dir="rtl" className="font-amiri">{RECITERS[getSafeReciter(reciter)].nameAr}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                L'audio suit automatiquement la riwaya choisie (Hafs, Warsh, Qalun) — الصوت يتبع الرواية المختارة
              </p>
            </div>
          </div>

          {/* Text Display Style */}
          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2 text-sm font-semibold">
              <Type className="h-3.5 w-3.5 text-primary" />
              Style d'affichage / نمط العرض
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

          {/* Verse view mode — only relevant for verse-based (non "pages-") styles */}
          {onVerseViewModeChange && !textDisplayStyle.startsWith('pages-') && (
            <div className="space-y-2">
              <Label className="text-foreground flex items-center gap-2 text-sm font-semibold">
                <Type className="h-3.5 w-3.5 text-primary" />
                Affichage des versets / عرض الآيات
              </Label>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { id: 'scroll' as VerseViewMode, name: 'Défilement / تمرير', desc: 'Toutes les pages à la suite' },
                  { id: 'page' as VerseViewMode, name: 'Page par page / صفحة بصفحة', desc: 'Une page du Mushaf à la fois' },
                ]).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onVerseViewModeChange(m.id)}
                    className={`p-2 rounded-lg border-2 transition-all text-left ${
                      verseViewMode === m.id
                        ? 'border-primary ring-2 ring-primary/30 bg-primary/10'
                        : 'border-border hover:border-primary/50 bg-muted/50'
                    }`}
                    aria-label={m.name}
                  >
                    <span className="block text-xs font-medium text-foreground">{m.name}</span>
                    <span className="block text-[10px] text-muted-foreground">{m.desc}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Le coloriage thématique des versets est conservé dans les deux modes.
              </p>
            </div>
          )}


          {/* Font Size */}
          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2 text-sm font-semibold">
              <TextCursor className="h-3.5 w-3.5 text-primary" />
              Taille de police / حجم الخط
            </Label>
            <div className="grid grid-cols-2 gap-1.5">
              {FONT_SIZES.map((size) => (
                <button
                  key={size.id}
                  onClick={() => onFontSizeChange(size.id)}
                  className={`p-2 rounded-lg border-2 transition-all text-center ${
                    fontSize === size.id
                      ? 'border-primary ring-2 ring-primary/30 bg-primary/10'
                      : 'border-border hover:border-primary/50 bg-muted/50'
                  }`}
                  aria-label={size.name}
                >
                  <span className="text-xs font-medium text-foreground">
                    {size.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Background Color */}
          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2 text-sm font-semibold">
              <Palette className="h-3.5 w-3.5 text-primary" />
              Couleur de fond / لون الخلفية
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

          {/* Offline Audio Cache */}
          <AudioCacheSettings />

          {/* Download Audio */}
          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2 text-sm font-semibold">
              <Download className="h-3.5 w-3.5 text-primary" />
              Télécharger l'audio / تحميل الصوت
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
                    تحميل... {downloadProgress}%
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5 mr-2" />
                    📖 Sourate / السورة
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
                📚 Quran complet / القرآن كاملاً
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Récitateur / القارئ: {RECITERS[getSafeReciter(reciter)].name} / {RECITERS[getSafeReciter(reciter)].nameAr}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
