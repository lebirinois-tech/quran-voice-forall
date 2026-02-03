import { Mic, Play, Pause, ArrowRight, ArrowLeft, Home, BookOpen, FileText, Layers, Repeat, Repeat1, Radio } from 'lucide-react';

export const VoiceCommandHelp = () => {
  const commands = [
    { icon: Radio, command: '"Coran" + commande', commandAr: '"قرآن" + الأمر', description: 'Mode mains libres', descriptionAr: 'وضع اليدين الحرة' },
    { icon: Play, command: '"Jouer" / "Lecture"', commandAr: '"تشغيل" / "اقرأ"', description: 'Démarrer la lecture', descriptionAr: 'بدء التشغيل' },
    { icon: Pause, command: '"Pause" / "Arrêter"', commandAr: '"توقف" / "إيقاف"', description: 'Mettre en pause', descriptionAr: 'إيقاف مؤقت' },
    { icon: ArrowRight, command: '"Suivant"', commandAr: '"التالي"', description: 'Verset suivant', descriptionAr: 'الآية التالية' },
    { icon: ArrowLeft, command: '"Précédent"', commandAr: '"السابق"', description: 'Verset précédent', descriptionAr: 'الآية السابقة' },
    { icon: Repeat1, command: '"Répéter 3/5 fois"', commandAr: '"كرر 3/5 مرات"', description: 'Répéter le verset', descriptionAr: 'تكرار الآية' },
    { icon: Repeat, command: '"Répéter versets 1 à 5"', commandAr: '"كرر الآيات 1 إلى 5"', description: 'Répéter une plage', descriptionAr: 'تكرار مجموعة' },
    { icon: Pause, command: '"Arrêter répétition"', commandAr: '"إيقاف التكرار"', description: 'Désactiver répétition', descriptionAr: 'إيقاف التكرار' },
    { icon: Home, command: '"Accueil" / "Retour"', commandAr: '"الرئيسية" / "رجوع"', description: 'Retour à l\'accueil', descriptionAr: 'العودة للرئيسية' },
    { icon: BookOpen, command: '"Sourate [nom/numéro]"', commandAr: '"سورة [الاسم/الرقم]"', description: 'Naviguer vers sourate', descriptionAr: 'انتقل إلى سورة' },
    { icon: FileText, command: '"Page [numéro]"', commandAr: '"صفحة [رقم]"', description: 'Naviguer vers page', descriptionAr: 'انتقل إلى صفحة' },
    { icon: Layers, command: '"Juz [numéro]"', commandAr: '"جزء [رقم]"', description: 'Naviguer vers Juz', descriptionAr: 'انتقل إلى جزء' },
  ];

  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-soft">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Mic className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Commandes Vocales / الأوامر الصوتية</h3>
          <p className="text-sm text-muted-foreground">Mode continu: dites "Coran" / قل "قرآن"</p>
        </div>
      </div>

      <div className="grid gap-2">
        {commands.map((cmd, index) => (
          <div 
            key={index}
            className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <cmd.icon className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-x-2 text-sm">
                <span className="font-medium text-foreground">{cmd.command}</span>
                <span className="font-medium text-primary/80 font-arabic">{cmd.commandAr}</span>
              </div>
              <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                <span>{cmd.description}</span>
                <span className="font-arabic">{cmd.descriptionAr}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
