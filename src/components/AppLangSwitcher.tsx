import { Languages } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { setAppLang, useAppLang, type AppLang } from '@/lib/i18n';
import { useTtsLang } from '@/hooks/useTtsLang';
import { cn } from '@/lib/utils';

/** Sélecteur permanent de la langue d'utilisation (menus + lecture audio). */
export const AppLangSwitcher = ({ className }: { className?: string }) => {
  const lang = useAppLang();
  const [, setTtsLang] = useTtsLang();
  return (
    <div className={cn('flex items-center gap-1 rounded-full px-2', className)}>
      <Languages className="h-4 w-4 shrink-0" />
      <Select
        value={lang}
        onValueChange={(v) => {
          setAppLang(v as AppLang);
          if (v === 'fr' || v === 'en') setTtsLang(v);
        }}
      >
        <SelectTrigger
          className="h-8 w-[92px] border-0 bg-transparent text-inherit text-xs focus:ring-0 focus:ring-offset-0"
          aria-label="Langue / اللغة / Language"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="z-[100]">
          <SelectItem value="fr">🇫🇷 FR</SelectItem>
          <SelectItem value="ar">🇸🇦 عربي</SelectItem>
          <SelectItem value="en">🇬🇧 EN</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
