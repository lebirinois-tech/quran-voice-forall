import { BookOpen, Home, Accessibility, Radio, Podcast } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { SettingsDialog } from './SettingsDialog';
import { ReciterId } from '@/hooks/useQuranAudio';

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
}: HeaderProps) => {
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
                aria-label="Retour à l'accueil"
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
                Quran Accès Pour Tous
              </h1>
              <p className="text-xs text-primary-foreground/70 hidden sm:block">
                Le Coran accessible à tous
              </p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {onReciterChange && onBackgroundColorChange && (
              <SettingsDialog
                reciter={reciter}
                onReciterChange={onReciterChange}
                backgroundColor={backgroundColor}
                onBackgroundColorChange={onBackgroundColorChange}
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
                aria-label={isContinuousMode ? "Désactiver le mode mains libres" : "Activer le mode mains libres"}
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
              aria-label="Mode accessibilité"
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
