import { setAppLang, useAppLang, useT, type AppLang } from '@/lib/i18n';
import { useTtsLang } from '@/hooks/useTtsLang';
import { cn } from '@/lib/utils';

const OPTIONS: { value: AppLang; label: string }[] = [
  { value: 'fr', label: 'FR' },
  { value: 'ar', label: 'عربي' },
  { value: 'en', label: 'EN' },
];

/** Les trois choix de langue affichés directement (menus + lecture audio). */
export const AppLangSwitcher = ({ className }: { className?: string }) => {
  const lang = useAppLang();
  const t = useT();
  const [, setTtsLang] = useTtsLang();

  const choose = (v: AppLang) => {
    setAppLang(v);
    if (v === 'fr' || v === 'en') setTtsLang(v);
  };

  return (
    <div
      role="group"
      aria-label={t('language')}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full bg-muted/80 p-0.5',
        className,
      )}
    >
      {OPTIONS.map((opt) => {
        const active = lang === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => choose(opt.value)}
            aria-pressed={active}
            lang={opt.value}
            className={cn(
              'rounded-full px-2 py-1 text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-background text-foreground font-semibold hover:bg-accent',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};
