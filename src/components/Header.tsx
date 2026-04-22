import { BookOpen, Home, Accessibility, Radio, Podcast, Download } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { SettingsDialog } from './SettingsDialog';
import { ReciterId } from '@/hooks/useQuranAudio';
import { TextDisplayStyle, FontSize } from '@/hooks/useAppSettings';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { usePwaInstall } from '@/contexts/PwaInstallContext';
import { useNavigate } from 'react-router-dom';
import { useAppSettings } from '@/hooks/useAppSettings';

interface HeaderProps {
  showBackButton?: boolean;
  onBack?: () => void;
  onAccessibilityToggle?: () => void;
  isAccessibilityMode?: boolean;
  isContinuousMode?: boolean;
  onToggleContinuous?: () => void;
  reciter?: ReciterId;
  onReciterChange?: (reciter: ReciterId) => void;
  backgroundColor?: string;
  onBackgroundColorChange?: (color: string) => void;
  textDisplayStyle?: TextDisplayStyle;
  onTextDisplayStyleChange?: (style: TextDisplayStyle) => void;
  fontSize?: FontSize;
  onFontSizeChange?: (size: FontSize) => void;
  showDualTranslation?: boolean;
  onShowDualTranslationChange?: (value: boolean) => void;
}

export const Header = ({ 
  showBackButton, 
  onBack,
  onAccessibilityToggle,
  isAccessibilityMode,
  isContinuousMode,
  onToggleContinuous,
  reciter = 'alafasy',
  onReciterChange,
  backgroundColor = 'hsl(45, 30%, 96%)',
  onBackgroundColorChange,
  textDisplayStyle = 'tajweed',
  onTextDisplayStyleChange,
  fontSize = 'medium',
  onFontSizeChange,
  showDualTranslation,
  onShowDualTranslationChange,
}: HeaderProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isInstalled, deferredPrompt, install } = usePwaInstall();
  const fallbackSettings = useAppSettings();

  // Always show settings: fall back to internal settings hook if no callbacks were provided.
  const effectiveReciter = onReciterChange ? reciter : fallbackSettings.reciter;
  const effectiveBackgroundColor = onBackgroundColorChange ? backgroundColor : fallbackSettings.backgroundColor;
  const effectiveTextDisplayStyle = onTextDisplayStyleChange ? textDisplayStyle : fallbackSettings.textDisplayStyle;
  const effectiveFontSize = onFontSizeChange ? fontSize : fallbackSettings.fontSize;
  const effectiveShowDualTranslation = onShowDualTranslationChange
    ? (showDualTranslation ?? fallbackSettings.showDualTranslation)
    : fallbackSettings.showDualTranslation;
  const handleReciterChange = onReciterChange ?? fallbackSettings.onReciterChange;
  const handleBackgroundColorChange = onBackgroundColorChange ?? fallbackSettings.onBackgroundColorChange;
  const handleTextDisplayStyleChange = onTextDisplayStyleChange ?? fallbackSettings.onTextDisplayStyleChange;
  const handleFontSizeChange = onFontSizeChange ?? fallbackSettings.onFontSizeChange;
  const handleShowDualTranslationChange =
    onShowDualTranslationChange ?? fallbackSettings.onShowDualTranslationChange;

  const handleInstall = async () => {
    if (deferredPrompt) {
      await install();
    } else {
      navigate('/install');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-gradient-islamic shadow-soft">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left side */}
          <div className="flex items-center gap-3">
            {showBackButton ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="text-primary-foreground hover:bg-primary-foreground/10"
                aria-label={t('common.home')}
              >
                <Home className="h-5 w-5" />
              </Button>
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
            
            <div>
              <h1 className="text-lg md:text-xl font-bold text-primary-foreground">
                {t('common.appName')}
              </h1>
              <p className="text-xs text-primary-foreground/70 hidden sm:block">
                {t('common.appTagline')}
              </p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1 sm:gap-2">
            <LanguageSwitcher />
            {!isInstalled && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleInstall}
                className="text-primary-foreground hover:bg-primary-foreground/10 gap-1.5"
                aria-label={t('common.installApp')}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">{t('common.install')}</span>
              </Button>
            )}
            <SettingsDialog
              reciter={effectiveReciter}
              onReciterChange={handleReciterChange}
              backgroundColor={effectiveBackgroundColor}
              onBackgroundColorChange={handleBackgroundColorChange}
              textDisplayStyle={effectiveTextDisplayStyle}
              onTextDisplayStyleChange={handleTextDisplayStyleChange}
              fontSize={effectiveFontSize}
              onFontSizeChange={handleFontSizeChange}
              showDualTranslation={effectiveShowDualTranslation}
              onShowDualTranslationChange={handleShowDualTranslationChange}
            />
            {onToggleContinuous && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleContinuous}
                className={cn(
                  "text-primary-foreground hover:bg-primary-foreground/10",
                  isContinuousMode && "bg-primary-foreground/20 ring-2 ring-primary-foreground/50"
                )}
                aria-label={isContinuousMode ? t('header.handsFreeOn') : t('header.handsFreeOff')}
                aria-pressed={isContinuousMode}
              >
                {isContinuousMode ? (
                  <Radio className="h-5 w-5 animate-pulse" />
                ) : (
                  <Podcast className="h-5 w-5" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onAccessibilityToggle}
              className={cn(
                "text-primary-foreground hover:bg-primary-foreground/10",
                isAccessibilityMode && "bg-primary-foreground/20"
              )}
              aria-label={t('header.accessibilityMode')}
              aria-pressed={isAccessibilityMode}
            >
              <Accessibility className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
