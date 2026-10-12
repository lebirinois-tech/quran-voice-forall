import { Home, Accessibility, Radio, Podcast, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { SettingsDialog } from './SettingsDialog';
import { ReciterId } from '@/hooks/useQuranAudio';
import { TextDisplayStyle, FontSize, VerseViewMode } from '@/hooks/useAppSettings';
import { useT } from '@/lib/i18n';
import { AppLangSwitcher } from './AppLangSwitcher';

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
  verseViewMode?: VerseViewMode;
  onVerseViewModeChange?: (mode: VerseViewMode) => void;
}

export const Header = ({ 
  showBackButton, 
  onBack,
  onAccessibilityToggle,
  isAccessibilityMode,
  isContinuousMode,
  onToggleContinuous,
  reciter = 'husary',
  onReciterChange,
  backgroundColor = 'hsl(45, 30%, 96%)',
  onBackgroundColorChange,
  textDisplayStyle = 'tajweed',
  onTextDisplayStyleChange,
  fontSize = 'medium',
  onFontSizeChange,
  verseViewMode = 'scroll',
  onVerseViewModeChange,
}: HeaderProps) => {
  const t = useT();
  const { isAuthenticated, signOut, loading: authLoading } = useAuth();
  return (
    <header className="sticky top-0 z-50 bg-gradient-islamic shadow-soft">
      <div className="container mx-auto px-4 py-3">
        <h1 className="text-center text-lg sm:text-xl md:text-2xl font-bold text-primary-foreground whitespace-nowrap leading-tight mb-2">
          {t('appTitle')}
        </h1>
        <div className="flex items-center justify-between">
          {/* Left side */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack ?? (() => window.location.assign('/'))}
              className="text-primary-foreground bg-primary-foreground/10 hover:bg-primary-foreground/20 rounded-full"
              aria-label={t('backHome')}
            >
              <Home className="h-5 w-5" />
            </Button>
            {!authLoading && (isAuthenticated ? (
              <Button variant="ghost" size="sm" onClick={() => signOut()} className="gap-1 text-primary-foreground bg-primary-foreground/10 hover:bg-primary-foreground/20 rounded-full">
                <LogOut className="h-4 w-4" />
                <span className="text-xs">{t('logout')}</span>
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => window.location.assign('/auth')} className="gap-1 text-primary-foreground bg-primary-foreground/10 hover:bg-primary-foreground/20 rounded-full">
                <LogIn className="h-4 w-4" />
                <span className="text-xs">{t('login')}</span>
              </Button>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <AppLangSwitcher className="bg-primary-foreground/10 text-primary-foreground" />
            {onReciterChange && onBackgroundColorChange && onTextDisplayStyleChange && onFontSizeChange && (
              <SettingsDialog
                reciter={reciter}
                onReciterChange={onReciterChange}
                backgroundColor={backgroundColor}
                onBackgroundColorChange={onBackgroundColorChange}
                textDisplayStyle={textDisplayStyle}
                onTextDisplayStyleChange={onTextDisplayStyleChange}
                fontSize={fontSize}
                onFontSizeChange={onFontSizeChange}
                verseViewMode={verseViewMode}
                onVerseViewModeChange={onVerseViewModeChange}
              />
            )}
            {onToggleContinuous && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleContinuous}
                className={cn(
                  "text-primary-foreground hover:bg-primary-foreground/10",
                  isContinuousMode && "bg-primary-foreground/20 ring-2 ring-primary-foreground/50"
                )}
                aria-label={isContinuousMode ? t('handsFreeOff') : t('handsFreeOn')}
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
              aria-label={t('accessibilityMode')}
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
