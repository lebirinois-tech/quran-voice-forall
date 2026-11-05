import { useEffect, useState } from 'react';
import { Play, Repeat, ChevronLeft, ChevronRight } from 'lucide-react';
import { surahs } from '@/data/surahs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useT } from '@/lib/i18n';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: number;
  /** First and last verse of the displayed page (same surah). */
  pageStart: number;
  pageEnd: number;
  /** Highest verse number of the surah, for range limits. */
  maxVerse: number;
  /** repeatCount: 0 = infinite. */
  onPlay: (start: number, end: number, repeatCount: number) => void;
  /** Déplacement vers une page du Mushaf (1-604). */
  onGoToPage?: (page: number) => void;
  /** Déplacement vers une sourate (1-114). */
  onGoToSurah?: (surah: number) => void;
};

/** Shared reading menu for Pages and Verses modes: page, single verse or verse range, with repetition. */
export function PageReadingDialog({ open, onOpenChange, page, pageStart, pageEnd, maxVerse, onPlay, onGoToPage, onGoToSurah }: Props) {
  const [pageInput, setPageInput] = useState(page);
  useEffect(() => { setPageInput(page); }, [page]);
  const goPage = (p: number) => {
    const n = Math.min(604, Math.max(1, Math.round(p) || 1));
    setPageInput(n);
    onGoToPage?.(n);
  };
  const t = useT();
  const fr = t.lang === 'fr';
  const ar = t.lang === 'ar';
  const L = (f: string, a: string, e: string) => (fr ? f : ar ? a : e);
  const [repeat, setRepeat] = useState(1);
  const [verse, setVerse] = useState(pageStart);
  const [from, setFrom] = useState(pageStart);
  const [to, setTo] = useState(pageEnd);

  useEffect(() => {
    if (open) { setVerse(pageStart); setFrom(pageStart); setTo(pageEnd); }
  }, [open, pageStart, pageEnd]);

  const clamp = (n: number) => Math.min(maxVerse, Math.max(1, Number.isFinite(n) ? Math.round(n) : 1));
  const go = (s: number, e: number) => {
    const a = clamp(s), b = clamp(e);
    onOpenChange(false);
    onPlay(Math.min(a, b), Math.max(a, b), repeat);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm z-[120]">
        <DialogHeader>
          <DialogTitle>{t('chooseReading')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {onGoToPage && (
            <div className="flex items-center gap-2">
              <span className="w-20 text-sm">{L('Page', 'الصفحة', 'Page')}</span>
              <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => goPage(page + 1)} aria-label={L('Page suivante', 'الصفحة التالية', 'Next page')}><ChevronLeft className="h-4 w-4" /></Button>
              <Input type="number" inputMode="numeric" min={1} max={604} value={pageInput} onChange={(e) => setPageInput(Number(e.target.value))} onKeyDown={(e) => e.key === 'Enter' && goPage(pageInput)} className="h-10 text-center" aria-label={L('Numéro de page', 'رقم الصفحة', 'Page number')} />
              <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => goPage(page - 1)} aria-label={L('Page précédente', 'الصفحة السابقة', 'Previous page')}><ChevronRight className="h-4 w-4" /></Button>
              <Button className="h-10 shrink-0" onClick={() => goPage(pageInput)}>{L('Aller', 'اذهب', 'Go')}</Button>
            </div>
          )}
          {onGoToSurah && (
            <div className="flex items-center gap-2">
              <span className="w-20 text-sm">{L('Sourate', 'السورة', 'Surah')}</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                defaultValue=""
                onChange={(e) => e.target.value && onGoToSurah(Number(e.target.value))}
                aria-label={L('Choisir une sourate', 'اختيار السورة', 'Choose surah')}
              >
                <option value="" disabled>{L('Choisir une sourate…', 'اختر سورة…', 'Choose a surah…')}</option>
                {surahs.map((s) => (
                  <option key={s.number} value={s.number}>{s.number}. {ar ? s.nameArabic : `${s.name} — ${s.nameArabic}`}</option>
                ))}
              </select>
            </div>
          )}
          <Button variant="outline" className="h-12 w-full justify-between" onClick={() => go(pageStart, pageEnd)}>
            <span className="flex items-center gap-2"><Play className="h-4 w-4 text-primary" />{L('Lire la page', 'قراءة الصفحة', 'Read page')} {page}</span>
            <span className="text-xs text-muted-foreground">v. {pageStart}–{pageEnd}</span>
          </Button>

          <div className="flex items-center gap-2">
            <span className="w-20 text-sm">{L('Verset', 'الآية', 'Verse')}</span>
            <Input type="number" inputMode="numeric" min={1} max={maxVerse} value={verse} onChange={(e) => setVerse(Number(e.target.value))} className="h-10" />
            <Button className="h-10 shrink-0" onClick={() => go(verse, verse)} aria-label={L('Lire le verset', 'قراءة الآية', 'Read verse')}><Play className="h-4 w-4" /></Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-20 text-sm">{L('Plage', 'من – إلى', 'Range')}</span>
            <Input type="number" inputMode="numeric" min={1} max={maxVerse} value={from} onChange={(e) => setFrom(Number(e.target.value))} className="h-10" aria-label={L('Du verset', 'من الآية', 'From verse')} />
            <span>–</span>
            <Input type="number" inputMode="numeric" min={1} max={maxVerse} value={to} onChange={(e) => setTo(Number(e.target.value))} className="h-10" aria-label={L('Au verset', 'إلى الآية', 'To verse')} />
            <Button className="h-10 shrink-0" onClick={() => go(from, to)} aria-label={L('Lire la plage', 'قراءة المقطع', 'Read range')}><Play className="h-4 w-4" /></Button>
          </div>

          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Repeat className="h-3.5 w-3.5" />{t('repeatCount')}</p>
            <div className="grid grid-cols-6 gap-1">
              {[1, 2, 3, 5, 10, 0].map((n) => (
                <Button key={n} variant={repeat === n ? 'default' : 'outline'} size="sm" className="h-9 px-0 text-xs" onClick={() => setRepeat(n)}>
                  {n === 0 ? '∞' : n}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
