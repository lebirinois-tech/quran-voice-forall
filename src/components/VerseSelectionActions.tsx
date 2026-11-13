import { useState } from 'react';
import { BookOpen, Headphones, X } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { ParagraphTafsir } from './ParagraphTafsir';
import { useT } from '@/lib/i18n';
import { selectionSegments, type VerseSelection } from '@/lib/verseSelection';

export function VerseSelectionActions({ selection, onCancel, onListen }: {
  selection: VerseSelection | null; onCancel: () => void; onListen: () => void;
}) {
  const t = useT();
  const [view, setView] = useState<'actions' | 'tafsir'>('actions');
  const [lang, setLang] = useState<'ar' | 'fr' | 'en'>(t.lang);
  if (!selection) return null;
  const label = `${selection.start.surah}:${selection.start.verse}${selection.end ? ` — ${selection.end.surah}:${selection.end.verse}` : ''}`;
  const cancel = () => { setView('actions'); onCancel(); };
  const startLabel = t.lang === 'ar' ? 'بداية المقطع' : t.lang === 'en' ? 'Passage start' : 'Début du passage';
  return <>
    {!selection.end && <div className="fixed left-1/2 top-2 z-[110] flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-2 rounded-md border border-secondary bg-background px-3 py-1 text-sm text-foreground shadow-md" role="status">
      <span className="whitespace-nowrap">{startLabel} · {label}</span>
      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label={t('cancel')} onClick={cancel}><X className="h-4 w-4" /></Button>
    </div>}
    <Dialog open={!!selection.end} onOpenChange={open => { if (!open) cancel(); }}>
      <DialogContent className="z-[120] max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{view === 'tafsir' ? t('tafsir') : (t.lang === 'ar' ? 'المقطع المحدد' : t.lang === 'en' ? 'Selected passage' : 'Plage sélectionnée')} · {label}</DialogTitle></DialogHeader>
        <div className="flex flex-wrap gap-2">
          <Button className="gap-2" onClick={() => { onListen(); cancel(); }}><Headphones className="h-4 w-4" />{t.lang === 'ar' ? 'استماع للمقطع' : t.lang === 'en' ? 'Listen to passage' : 'Écouter la plage'}</Button>
          <Button variant="outline" className="gap-2" onClick={() => setView('tafsir')}><BookOpen className="h-4 w-4" />{t('tafsir')}</Button>
          <Button variant="ghost" className="gap-2" onClick={cancel}><X className="h-4 w-4" />{t('cancel')}</Button>
        </div>
        {view === 'tafsir' && <>
          <div className="flex gap-1" role="group" aria-label={t('language')}>
            {(['ar', 'fr', 'en'] as const).map(l => <Button key={l} size="sm" variant={lang === l ? 'default' : 'outline'} onClick={() => setLang(l)}>{l === 'ar' ? 'العربية' : l === 'fr' ? 'Français' : 'English'}</Button>)}
          </div>
          {selectionSegments(selection).map(segment => <ParagraphTafsir key={`${segment.surah}:${segment.start}:${segment.end}`} paragraph={segment} lang={lang} />)}
        </>}
      </DialogContent>
    </Dialog>
  </>;
}