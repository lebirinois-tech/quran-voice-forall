import { GraduationCap } from 'lucide-react';
import { useHifzPlan } from '@/contexts/HifzPlanContext';
import { Button } from '@/components/ui/button';

export function HifzShortcut({ surah }: { surah: number | string }) {
  const { due } = useHifzPlan();
  return <Button type="button" size="icon" variant="ghost"
    aria-label={`Mémorisation · مراجعة الحفظ${due.length ? ` · ${due.length} à réviser` : ''}`}
    title="Mémorisation · مراجعة الحفظ"
    onClick={() => window.location.assign(`/hifz?surah=${surah}${due.length ? '&tab=plan' : ''}`)}
    className="relative h-8 w-8 shrink-0 rounded-full text-primary">
    <GraduationCap className="h-4 w-4" />
    {due.length > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[10px] font-bold text-destructive-foreground">{due.length > 9 ? '9+' : due.length}</span>}
  </Button>;
}