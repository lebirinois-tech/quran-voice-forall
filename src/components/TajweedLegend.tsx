import { useState } from 'react';
import { ChevronDown, ChevronUp, Palette } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

const TAJWEED_RULES = [
  { name: 'Ghunnah (غنة)', color: '#2AAD2A', description: 'Nasalisation' },
  { name: 'Qalqalah (قلقلة)', color: '#2E6ECB', description: 'Écho / rebond' },
  { name: 'Ikhfaa / Madd (إخفاء / مد)', color: '#DD0000', description: 'Dissimulation / Prolongation' },
  { name: 'Idgham avec Ghunnah (إدغام بغنة)', color: '#B266D9', description: 'Assimilation nasale' },
  { name: 'Iqlab (إقلاب)', color: '#D4740C', description: 'Substitution' },
  { name: 'Silencieux (سكت)', color: '#AAAAAA', description: 'Lettres silencieuses' },
];

export const TajweedLegend = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="max-w-3xl mx-auto mb-4 animate-fade-in">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 bg-card border-border"
      >
        <span className="flex items-center gap-2 text-sm">
          <Palette className="h-4 w-4 text-primary" />
          Légende Tajweed
        </span>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      {isOpen && (
        <div className="mt-2 p-4 bg-card border border-border rounded-xl grid grid-cols-2 sm:grid-cols-3 gap-3">
          {TAJWEED_RULES.map((rule) => (
            <div key={rule.name} className="flex items-start gap-2">
              <span
                className="mt-1 inline-block w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: rule.color }}
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground leading-tight">{rule.name}</p>
                <p className="text-xs text-muted-foreground leading-tight">{rule.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
