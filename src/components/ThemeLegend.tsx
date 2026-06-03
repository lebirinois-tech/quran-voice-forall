import { useState } from 'react';
import { ChevronDown, ChevronUp, Palette } from 'lucide-react';
import { Button } from './ui/button';
import { QURAN_THEMES } from '@/data/quranThemes';

/**
 * Collapsible legend listing the thematic colors used to tint verses.
 * Trilingual: shows AR + FR (EN on hover/title).
 */
export const ThemeLegend = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="max-w-3xl mx-auto mb-4 px-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="w-full justify-between bg-card/60 backdrop-blur-sm border-border/60"
      >
        <span className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            🎨 Thèmes du Coran / مواضيع القرآن / Quranic Themes
          </span>
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      {open && (
        <div className="mt-2 p-4 rounded-lg bg-card/80 backdrop-blur-sm border border-border/60 animate-fade-in">
          <p className="text-xs text-muted-foreground mb-3">
            Les versets traitant d'un thème sont surlignés avec sa couleur. Un même verset peut appartenir à plusieurs thèmes.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {QURAN_THEMES.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 p-2 rounded-md"
                style={{ backgroundColor: `hsl(${t.hsl} / 0.12)` }}
                title={t.labels.en}
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0 border border-border/40"
                  style={{ backgroundColor: `hsl(${t.hsl})` }}
                />
                <span className="text-xs flex-1 truncate">
                  <span className="font-semibold" style={{ color: `hsl(${t.hsl})` }}>
                    {t.emoji} {t.labels.fr}
                  </span>
                  <span className="text-muted-foreground mx-1">·</span>
                  <span className="font-arabic">{t.labels.ar}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
