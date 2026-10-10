import { useState } from 'react';
import { Settings, Volume2, Download, Palette, Check, Type, TextCursor, Languages } from 'lucide-react';
import { useTtsLang } from '@/hooks/useTtsLang';
import { setStoredVoiceLang } from '@/hooks/useVoiceCommands';
import { useAppLang, setAppLang, useT, AppLang } from '@/lib/i18n';
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
import { RECITERS, ReciterId, getSafeReciter } from '@/hooks/useQuranAudio';
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
  { id: 'default', key: 'bgDefault' as const, value: 'hsl(45, 30%, 96%)' },
  { id: 'white', key: 'bgWhite' as const, value: 'hsl(0, 0%, 100%)' },
  { id: 'sepia', key: 'bgSepia' as const, value: 'hsl(35, 40%, 90%)' },
  { id: 'dark', key: 'bgDark' as const, value: 'hsl(150, 30%, 8%)' },
  { id: 'night', key: 'bgNight' as const, value: 'hsl(220, 20%, 12%)' },
  { id: 'emerald-light', key: 'bgEmerald' as const, value: 'hsl(158, 30%, 95%)' },
];

const TEXT_DISPLAY_STYLES = [
  { id: 'tajweed' as TextDisplayStyle, key: 'styleHafsVerse' as const, descKey: 'styleHafsVerseDesc' as const, icon: '🎨' },
  { id: 'warsh-tajweed' as TextDisplayStyle, key: 'styleWarshVerse' as const, descKey: 'styleWarshVerseDesc' as const, icon: '🕌' },
  { id: 'qalun-tajweed' as TextDisplayStyle, key: 'styleQalunVerse' as const, descKey: 'styleQalunVerseDesc' as const, icon: '🟢' },
  { id: 'pages-hafs' as TextDisplayStyle, key: 'styleHafsPages' as const, descKey: 'styleHafsPagesDesc' as const, icon: '📖' },
  { id: 'pages-warsh' as TextDisplayStyle, key: 'styleWarshPages' as const, descKey: 'styleWarshPagesDesc' as const, icon: '📜' },
  { id: 'pages-qalun' as TextDisplayStyle, key: 'styleQalunPages' as const, descKey: 'styleQalunPagesDesc' as const, icon: '📗' },
];

const FONT_SIZES = [
  { id: 'small' as FontSize, key: 'fontSmall' as const },
  { id: 'medium' as FontSize, key: 'fontMedium' as const },
  { id: 'large' as FontSize, key: 'fontLarge' as const },
  { id: 'xlarge' as FontSize, key: 'fontXLarge' as const },
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
  const [, setTtsLang] = useTtsLang();
  const appLang = useAppLang();
  const t = useT();
  const changeLang = (l: AppLang) => {
    setAppLang(l);
    setStoredVoiceLang(l);
    setTtsLang(l === 'en' ? 'en' : 'fr');
  };
  const [isDownloadingSurah, setIsDownloadingSurah] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const getCurrentSurahNumber = () => {
    const pathMatch = window.location.pathname.match(/\/surah\/(\d+)/);
    return pathMatch ? parseInt(pathMatch[1]) : null;
  };

  const handleDownloadSurah = async () => {
    const surahNumber = getCurrentSurahNumber();
    if (!surahNumber) {
      toast.info(t('openSurahToDownload'));
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
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        toast.success(`${surahName} (${ayahs.length})`);
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error(t('downloadError'));
    } finally {
      setIsDownloadingSurah(false);
      setDownloadProgress(0);
    }
  };

  const handleOpenQuranDownloadLink = () => {
    const quranicAudioId = RECITERS[reciter]?.quranicAudioId ?? 18;
    window.open(`https://quranicaudio.com/quran/${quranicAudioId}`, '_blank');
    toast.info(t('redirectQuranicAudio'));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size={triggerLabel ? 'default' : 'icon'}
          className={cn('text-primary-foreground hover:bg-primary-foreground/10', triggerClassName)}
          aria-label={t('settings')}
        >
          <Settings className="h-5 w-5" />
          {triggerLabel && <span>{triggerLabel}</span>}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="z-[120] sm:max-w-md bg-card border-border max-h-[85vh] overflow-y-auto"
        dir={appLang === 'ar' ? 'rtl' : 'ltr'}
      >
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            {t('settings')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Langue de l'application */}
          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2 text-sm font-semibold">
              <Languages className="h-3.5 w-3.5 text-primary" />
              {t('language')}
            </Label>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { id: 'fr', name: '🇫🇷 Français' },
                { id: 'ar', name: '🇸🇦 العربية' },
                { id: 'en', name: '🇬🇧 English' },
              ] as const).map((l) => (
                <button
                  key={l.id}
                  onClick={() => {
                    changeLang(l.id);
                    toast.success(l.name);
                  }}
                  className={cn(
                    'p-2 rounded-lg border-2 text-xs font-medium text-foreground transition-all',
                    appLang === l.id ? 'border-primary bg-primary/10' : 'border-border bg-muted/50'
                  )}
                >
                  {l.name}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{t('languageHint')}</p>
          </div>

          {/* Récitateur — automatique selon la riwaya affichée */}
          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2 text-sm font-semibold">
              <Volume2 className="h-3.5 w-3.5 text-primary" />
              {t('reciter')}
            </Label>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm text-foreground">
                {RECITERS[getSafeReciter(reciter)].name} /{' '}
                <span dir="rtl" className="font-amiri">{RECITERS[getSafeReciter(reciter)].nameAr}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">{t('reciterAuto')}</p>
            </div>
          </div>

          {/* Text Display Style */}
          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2 text-sm font-semibold">
              <Type className="h-3.5 w-3.5 text-primary" />
              {t('displayStyle')}
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
                  <Label htmlFor={`style-${style.id}`} className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{style.icon}</span>
                      <div>
                        <p className="text-foreground text-sm font-medium">{t(style.key)}</p>
                        <p className="text-xs text-muted-foreground">{t(style.descKey)}</p>
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
                {t('verseDisplay')}
              </Label>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { id: 'scroll' as VerseViewMode, nameKey: 'scrollMode' as const, descKey: 'scrollModeDesc' as const },
                  { id: 'page' as VerseViewMode, nameKey: 'pageMode' as const, descKey: 'pageModeDesc' as const },
                ]).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onVerseViewModeChange(m.id)}
                    className={`p-2 rounded-lg border-2 transition-all text-left ${
                      verseViewMode === m.id
                        ? 'border-primary ring-2 ring-primary/30 bg-primary/10'
                        : 'border-border hover:border-primary/50 bg-muted/50'
                    }`}
                    aria-label={t(m.nameKey)}
                  >
                    <span className="block text-xs font-medium text-foreground">{t(m.nameKey)}</span>
                    <span className="block text-[10px] text-muted-foreground">{t(m.descKey)}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{t('themeKept')}</p>
            </div>
          )}

          {/* Font Size */}
          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2 text-sm font-semibold">
              <TextCursor className="h-3.5 w-3.5 text-primary" />
              {t('fontSize')}
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
                  aria-label={t(size.key)}
                >
                  <span className="text-xs font-medium text-foreground">{t(size.key)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Background Color */}
          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2 text-sm font-semibold">
              <Palette className="h-3.5 w-3.5 text-primary" />
              {t('bgColor')}
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
                  aria-label={t(color.key)}
                >
                  <span
                    className={`text-xs font-medium ${
                      color.id === 'dark' || color.id === 'night'
                        ? 'text-white'
                        : 'text-foreground'
                    }`}
                  >
                    {t(color.key)}
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
              {t('downloadAudio')}
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
                    {downloadProgress}%
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5 mr-2" />
                    📖 {t('surahDownload')}
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
                📚 {t('fullQuran')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('reciter')}: {RECITERS[getSafeReciter(reciter)].name} / {RECITERS[getSafeReciter(reciter)].nameAr}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
