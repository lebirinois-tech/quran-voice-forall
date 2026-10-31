import { TAFSIR_SOURCES, useTafsirSource } from '@/lib/offlineTafsir';
import { getAppLang } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** Choix du Tafsir (Al-Muyassar, Al-Mukhtasar, As-Sa'di) — partagé par Pages, Versets et Paramètres. */
export function TafsirSourcePicker({ className }: { className?: string }) {
  const [source, setSource] = useTafsirSource();
  const l = getAppLang();
  const lang = l === 'ar' || l === 'en' ? l : 'fr';
  return (
    <div role="radiogroup" aria-label={lang === 'ar' ? 'اختيار التفسير' : lang === 'en' ? 'Choose tafsir' : 'Choisir le Tafsir'}
      className={cn('flex flex-wrap justify-center gap-1', className)}>
      {TAFSIR_SOURCES.map(s => (
        <button key={s.id} type="button" role="radio" aria-checked={source === s.id}
          onClick={() => setSource(s.id)}
          className={cn('rounded-full border px-2.5 py-1 text-xs transition-colors',
            source === s.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-foreground hover:bg-primary/10')}>
          {s[lang]}
        </button>
      ))}
    </div>
  );
}
