import { BookOpen, Home, Settings, Accessibility } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface HeaderProps {
  showBackButton?: boolean;
  onBack?: () => void;
  onAccessibilityToggle?: () => void;
  isAccessibilityMode?: boolean;
}

export const Header = ({ 
  showBackButton, 
  onBack,
  onAccessibilityToggle,
  isAccessibilityMode 
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
