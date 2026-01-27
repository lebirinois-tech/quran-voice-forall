import { Mic, MicOff, Radio, Podcast } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

interface VoiceCommandButtonProps {
  isListening: boolean;
  isContinuousMode?: boolean;
  isAwaitingCommand?: boolean;
  isSupported: boolean;
  onToggle: () => void;
  onToggleContinuous?: () => void;
  transcript?: string;
  className?: string;
}

export const VoiceCommandButton = ({
  isListening,
  isContinuousMode = false,
  isAwaitingCommand = false,
  isSupported,
  onToggle,
  onToggleContinuous,
  transcript,
  className,
}: VoiceCommandButtonProps) => {
  if (!isSupported) {
    return null;
  }

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="flex gap-2">
        {/* Continuous Mode Toggle */}
        {onToggleContinuous && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isContinuousMode ? "secondary" : "outline"}
                  size="icon"
                  onClick={onToggleContinuous}
                  className={cn(
                    "rounded-full transition-all duration-300",
                    isContinuousMode && "ring-2 ring-primary bg-primary/10"
                  )}
                  aria-label={isContinuousMode ? "Désactiver le mode continu" : "Activer le mode continu (dites 'Coran' pour commander)"}
                >
                  {isContinuousMode ? (
                    <Radio className="h-5 w-5 text-primary animate-pulse" />
                  ) : (
                    <Podcast className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="font-medium">Mode mains libres</p>
                <p className="text-xs text-muted-foreground">
                  {isContinuousMode 
                    ? "Actif - dites 'Coran' suivi de votre commande" 
                    : "Cliquez pour activer l'écoute continue"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Manual Trigger Button */}
        <Button
          variant={isListening ? "voice" : "islamic"}
          size="icon-lg"
          onClick={onToggle}
          className={cn(
            "rounded-full transition-all duration-300",
            isListening && "voice-pulse bg-secondary",
            isContinuousMode && "opacity-50"
          )}
          aria-label={isListening ? "Arrêter l'écoute" : "Activer la commande vocale"}
          disabled={isContinuousMode}
        >
          {isListening ? (
            <Mic className="h-6 w-6 animate-pulse" />
          ) : (
            <MicOff className="h-6 w-6" />
          )}
        </Button>
      </div>
      
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
              ? "Commande attendue..." 
              : transcript 
                ? transcript 
                : isContinuousMode 
                  ? "Dites 'Coran' + commande" 
                  : "Écoute en cours..."}
          </span>
        </div>
      )}
    </div>
  );
};
