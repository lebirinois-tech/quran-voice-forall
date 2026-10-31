import { Apple, Share, PlusSquare, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppLang } from '@/lib/i18n';

const copy = {
  fr: {
    title: 'Installer sur iPhone / iPad',
    note: 'Apple demande ces trois gestes pour ajouter l’application.',
    steps: ['Touchez Partager dans le menu de votre navigateur (… si nécessaire).', 'Choisissez « Sur l’écran d’accueil » (faites défiler le menu si nécessaire).', 'Confirmez avec « Ajouter ».'],
    browser: 'Si cette option manque, ouvrez ce même lien dans Safari.',
    done: 'Compris',
  },
  ar: {
    title: 'التثبيت على iPhone / iPad',
    note: 'تطلب Apple هذه الخطوات الثلاث لإضافة التطبيق.',
    steps: ['اضغط على مشاركة في قائمة المتصفح (… عند الحاجة).', 'اختر «إضافة إلى الشاشة الرئيسية» (مرّر القائمة عند الحاجة).', 'أكد بالضغط على «إضافة».'],
    browser: 'إذا لم يظهر الخيار، افتح الرابط نفسه في Safari.',
    done: 'فهمت',
  },
  en: {
    title: 'Install on iPhone / iPad',
    note: 'Apple requires these three steps to add the app.',
    steps: ['Tap Share in your browser menu (… if needed).', 'Choose “Add to Home Screen” (scroll the menu if needed).', 'Confirm with “Add”.'],
    browser: 'If this option is missing, open this same link in Safari.',
    done: 'Got it',
  },
};

export function IPhoneInstallDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const lang = useAppLang();
  const text = copy[lang];
  const icons = [Share, PlusSquare, Check];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-lg" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <Apple className="h-8 w-8 text-primary mx-auto mb-2" />
          <DialogTitle>{text.title}</DialogTitle>
          <DialogDescription>{text.note}</DialogDescription>
        </DialogHeader>
        <ol className="space-y-5 py-2">
          {text.steps.map((step, index) => {
            const Icon = icons[index];
            return <li key={step} className="flex items-start gap-3 text-foreground">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {Icon && <Icon className="h-6 w-6" />}
              </span>
              <span className="text-base leading-relaxed"><strong>{index + 1}.</strong> {step}</span>
            </li>;
          })}
        </ol>
        <p className="text-sm text-muted-foreground">{text.browser}</p>
        <Button onClick={() => onOpenChange(false)}>{text.done}</Button>
      </DialogContent>
    </Dialog>
  );
}