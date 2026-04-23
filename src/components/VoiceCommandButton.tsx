import { Mic, MicOff, Globe } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import type { VoiceLang } from '@/hooks/useVoiceCommands';

interface VoiceCommandButtonProps {
  isListening: boolean;
  isContinuousMode?: boolean;
  isAwaitingCommand?: boolean;
  isSupported: boolean;
  onToggle: () => void;
  transcript?: string;
  voiceLang?: VoiceLang;
  onLangChange?: (lang: VoiceLang) => void;
  className?: string;
}

export const VoiceCommandButton = ({
  isListening,
  isContinuousMode = false,
  isAwaitingCommand = false,
  isSupported,
  onToggle,
  transcript,
  voiceLang = 'fr',
  onLangChange,
  className,
}: VoiceCommandButtonProps) => {
  if (!isSupported) return null;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      {/* Language Toggle */}
      {onLangChange && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onLangChange(voiceLang === 'fr' ? 'en' : voiceLang === 'en' ? 'ar' : 'fr')}
          className="gap-2 rounded-full text-xs"
        >
          <Globe className="h-3.5 w-3.5" />
          {voiceLang === 'fr'
            ? 'Français → English'
            : voiceLang === 'en'
              ? 'English → العربية'
              : 'العربية → Français'}
        </Button>
      )}

      {/* Manual Trigger Button - hidden when continuous mode is active */}
      {!isContinuousMode && (
        <Button
          variant={isListening ? "voice" : "islamic"}
          size="icon-lg"
          onClick={onToggle}
          className={cn(
            "rounded-full transition-all duration-300",
            isListening && "voice-pulse bg-secondary"
          )}
          aria-label={isListening ? "Arrêter l'écoute" : "Activer la commande vocale"}
        >
          {isListening ? (
            <Mic className="h-6 w-6 animate-pulse" />
          ) : (
            <MicOff className="h-6 w-6" />
          )}
        </Button>
      )}
      
      {/* Status Display */}
      {(isListening || isContinuousMode) && (
        <div className={cn(
          "flex items-center gap-1 px-4 py-2 rounded-full shadow-soft animate-fade-in",
          isAwaitingCommand ? "bg-primary text-primary-foreground" : "bg-card"
        )}>
          <div className="flex gap-1">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1 rounded-full listening-wave",
                  isAwaitingCommand ? "bg-primary-foreground" : "bg-primary"
                )}
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
          <span className={cn(
            "text-sm ml-2",
            isAwaitingCommand ? "text-primary-foreground font-medium" : "text-muted-foreground"
          )}>
            {isAwaitingCommand 
              ? (voiceLang === 'ar' ? "في انتظار الأمر..." : voiceLang === 'en' ? "Awaiting command..." : "Commande attendue...")
              : transcript 
                ? transcript 
                : isContinuousMode 
                  ? (voiceLang === 'ar' ? 'قل "قرآن" + الأمر' : voiceLang === 'en' ? 'Say "Quran" + command' : "Dites 'Coran' + commande")
                  : (voiceLang === 'ar' ? "جاري الاستماع..." : voiceLang === 'en' ? "Listening..." : "Écoute en cours...")}
          </span>
        </div>
      )}
    </div>
  );
};
