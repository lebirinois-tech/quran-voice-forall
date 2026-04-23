import { Mic, Play, Pause, ArrowRight, ArrowLeft, Home, BookOpen, FileText, Layers, Repeat, Repeat1, Radio } from 'lucide-react';
import type { VoiceLang } from '@/hooks/useVoiceCommands';

interface VoiceCommandHelpProps {
  voiceLang?: VoiceLang;
}

export const VoiceCommandHelp = ({ voiceLang = 'fr' }: VoiceCommandHelpProps) => {
  const commandsFr = [
    { icon: Radio, command: '"Coran" + commande', description: 'Mode mains libres' },
    { icon: Play, command: '"Jouer" / "Lecture"', description: 'Démarrer la lecture' },
    { icon: Pause, command: '"Pause" / "Arrêter"', description: 'Mettre en pause' },
    { icon: ArrowRight, command: '"Suivant"', description: 'Verset suivant' },
    { icon: ArrowLeft, command: '"Précédent"', description: 'Verset précédent' },
    { icon: Repeat1, command: '"Répéter 3/5 fois"', description: 'Répéter le verset' },
    { icon: Repeat, command: '"Répéter versets 1 à 5"', description: 'Répéter une plage' },
    { icon: Pause, command: '"Arrêter répétition"', description: 'Désactiver répétition' },
    { icon: Home, command: '"Accueil" / "Retour"', description: 'Retour à l\'accueil' },
    { icon: BookOpen, command: '"Sourate [nom/numéro]"', description: 'Naviguer vers sourate' },
    { icon: FileText, command: '"Page [numéro]"', description: 'Naviguer vers page' },
    { icon: Layers, command: '"Juz [numéro]"', description: 'Naviguer vers Juz' },
  ];

  const commandsAr = [
    { icon: Radio, command: '"قرآن" + الأمر', description: 'وضع اليدين الحرة' },
    { icon: Play, command: '"تشغيل" / "اقرأ"', description: 'بدء التشغيل' },
    { icon: Pause, command: '"توقف" / "إيقاف"', description: 'إيقاف مؤقت' },
    { icon: ArrowRight, command: '"التالي"', description: 'الآية التالية' },
    { icon: ArrowLeft, command: '"السابق"', description: 'الآية السابقة' },
    { icon: Repeat1, command: '"كرر 3/5 مرات"', description: 'تكرار الآية' },
    { icon: Repeat, command: '"كرر الآيات 1 إلى 5"', description: 'تكرار مجموعة' },
    { icon: Pause, command: '"إيقاف التكرار"', description: 'إيقاف التكرار' },
    { icon: Home, command: '"الرئيسية" / "رجوع"', description: 'العودة للرئيسية' },
    { icon: BookOpen, command: '"سورة [الاسم/الرقم]"', description: 'انتقل إلى سورة' },
    { icon: FileText, command: '"صفحة [رقم]"', description: 'انتقل إلى صفحة' },
    { icon: Layers, command: '"جزء [رقم]"', description: 'انتقل إلى جزء' },
  ];

  const commandsEn = [
    { icon: Radio, command: '"Quran" + command', description: 'Hands-free mode' },
    { icon: Play, command: '"Play" / "Start"', description: 'Start playback' },
    { icon: Pause, command: '"Pause" / "Stop"', description: 'Pause playback' },
    { icon: ArrowRight, command: '"Next"', description: 'Next verse' },
    { icon: ArrowLeft, command: '"Previous"', description: 'Previous verse' },
    { icon: Repeat1, command: '"Repeat 3/5 times"', description: 'Repeat verse' },
    { icon: Repeat, command: '"Repeat verses 1 to 5"', description: 'Repeat a range' },
    { icon: Pause, command: '"Stop repeat"', description: 'Disable repetition' },
    { icon: Home, command: '"Home" / "Back"', description: 'Return home' },
    { icon: BookOpen, command: '"Surah [name/number]"', description: 'Go to surah' },
    { icon: FileText, command: '"Page [number]"', description: 'Go to page' },
    { icon: Layers, command: '"Juz [number]"', description: 'Go to Juz' },
  ];

  const commands = voiceLang === 'ar' ? commandsAr : voiceLang === 'en' ? commandsEn : commandsFr;
  const isAr = voiceLang === 'ar';

  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-soft" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Mic className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">
            {isAr ? 'الأوامر الصوتية' : voiceLang === 'en' ? 'Voice Commands' : 'Commandes Vocales'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isAr ? 'قل "قرآن" ثم الأمر' : voiceLang === 'en' ? 'Say "Quran" then the command' : 'Dites "Coran" puis la commande'}
          </p>
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
              <span className={`text-sm font-medium text-foreground ${isAr ? 'font-arabic' : ''}`}>
                {cmd.command}
              </span>
              <p className={`text-xs text-muted-foreground ${isAr ? 'font-arabic' : ''}`}>
                {cmd.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
