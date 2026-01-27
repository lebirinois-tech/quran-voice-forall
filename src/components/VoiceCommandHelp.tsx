import { Mic, Play, Pause, ArrowRight, ArrowLeft, Home, BookOpen, FileText } from 'lucide-react';

export const VoiceCommandHelp = () => {
  const commands = [
    { icon: Play, command: '"Jouer" / "Lecture"', description: 'Démarrer la lecture audio' },
    { icon: Pause, command: '"Pause" / "Arrêter"', description: 'Mettre en pause' },
    { icon: ArrowRight, command: '"Suivant"', description: 'Verset suivant' },
    { icon: ArrowLeft, command: '"Précédent"', description: 'Verset précédent' },
    { icon: Home, command: '"Accueil" / "Retour"', description: 'Retour à l\'accueil' },
    { icon: BookOpen, command: '"Sourate [numéro/nom]"', description: 'Naviguer vers une sourate' },
    { icon: FileText, command: '"Page [numéro]"', description: 'Naviguer vers une page (1-604)' },
  ];

  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-soft">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Mic className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Commandes Vocales</h3>
          <p className="text-sm text-muted-foreground">Dites une commande après avoir activé le micro</p>
        </div>
      </div>

      <div className="grid gap-3">
        {commands.map((cmd, index) => (
          <div 
            key={index}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <cmd.icon className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground">{cmd.command}</p>
              <p className="text-xs text-muted-foreground">{cmd.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
