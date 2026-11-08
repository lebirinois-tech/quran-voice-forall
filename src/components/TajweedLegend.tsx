import { useState } from 'react';
import { ChevronDown, ChevronUp, Palette } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useT } from '@/lib/i18n';

const TAJWEED_RULES = [
  { name: 'Ghunnah (غنة)', color: '#2AAD2A', description: 'Nasalisation' },
  { name: 'Qalqalah (قلقلة)', color: '#2E6ECB', description: 'Écho / rebond' },
  { name: 'Ikhfaa / Madd (إخفاء / مد)', color: '#DD0000', description: 'Dissimulation / Prolongation' },
  { name: 'Idgham avec Ghunnah (إدغام بغنة)', color: '#B266D9', description: 'Assimilation nasale' },
  { name: 'Iqlab (إقلاب)', color: '#D4740C', description: 'Substitution' },
  { name: 'Silencieux (سكت)', color: '#AAAAAA', description: 'Lettres silencieuses' },
];

export const TajweedLegend = ({ compact = false }: { compact?: boolean }) => {
  const t = useT();
  const title = t.lang === 'ar' ? 'ألوان التجويد' : t.lang === 'en' ? 'Tajweed colours' : 'Légende Tajweed';
  const [isOpen, setIsOpen] = useState(false);

  const rules = <div className="grid grid-cols-2 gap-4">
    {TAJWEED_RULES.map((rule) => <div key={rule.name} className="flex items-start gap-2">
      <span className="mt-1 inline-block h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: rule.color }} />
      <div className="min-w-0"><p className="text-sm font-semibold text-foreground">{rule.name}</p><p className="text-xs text-muted-foreground">{rule.description}</p></div>
    </div>)}
  </div>;
  if (compact) return <>
    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full text-primary" title={title} aria-label={title} onClick={() => setIsOpen(true)}><Palette className="h-4 w-4" /></Button>
    <Dialog open={isOpen} onOpenChange={setIsOpen}><DialogContent className="z-[130] max-w-sm" aria-describedby={undefined}><DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>{rules}</DialogContent></Dialog>
  </>;
  return <div className="max-w-3xl mx-auto mb-4">
    <Button variant="outline" size="sm" onClick={() => setIsOpen(!isOpen)} className="w-full justify-between gap-2"><span className="flex items-center gap-2"><Palette className="h-4 w-4" />{title}</span>{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button>
    {isOpen && <div className="mt-2 p-4 border border-border rounded-lg">{rules}</div>}
  </div>;
};
