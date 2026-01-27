import { Mic, MicOff } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface VoiceCommandButtonProps {
  isListening: boolean;
  isSupported: boolean;
  onToggle: () => void;
  transcript?: string;
  className?: string;
}

export const VoiceCommandButton = ({
  isListening,
  isSupported,
  onToggle,
  transcript,
  className,
}: VoiceCommandButtonProps) => {
  if (!isSupported) {
    return null;
  }

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
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
      
      {isListening && (
        <div className="flex items-center gap-1 px-4 py-2 bg-card rounded-full shadow-soft animate-fade-in">
          <div className="flex gap-1">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-primary rounded-full listening-wave"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
          <span className="text-sm text-muted-foreground ml-2">
            {transcript || "Écoute en cours..."}
          </span>
        </div>
      )}
    </div>
  );
};
