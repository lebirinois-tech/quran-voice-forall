import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES, type AppLanguage } from '@/i18n';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  variant?: 'header' | 'floating';
  className?: string;
}

export const LanguageSwitcher = ({ variant = 'header', className }: LanguageSwitcherProps) => {
  const { i18n, t } = useTranslation();
  const current = (i18n.language?.split('-')[0] as AppLanguage) || 'fr';

  const handleSelect = (lng: AppLanguage) => {
    i18n.changeLanguage(lng);
  };

  const isHeader = variant === 'header';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'gap-1.5',
            isHeader && 'text-primary-foreground hover:bg-primary-foreground/10',
            className,
          )}
          aria-label={t('common.language')}
        >
          <Languages className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase">{current}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {SUPPORTED_LANGUAGES.map((lng) => (
          <DropdownMenuItem
            key={lng}
            onClick={() => handleSelect(lng)}
            className={cn('gap-2 cursor-pointer', current === lng && 'bg-accent font-semibold')}
          >
            <span className="text-base">{LANGUAGE_LABELS[lng].flag}</span>
            <span>{LANGUAGE_LABELS[lng].native}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};