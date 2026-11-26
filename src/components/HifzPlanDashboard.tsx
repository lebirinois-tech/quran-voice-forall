import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BookOpen, Check, Plus, Mic, Trash2, CalendarCheck, Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import type { SuperMemoGrade } from 'supermemo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHifzPlan } from '@/contexts/HifzPlanContext';
import { createHifzEntry, loadHifzCorpus, localDay, resolveHifzRanges, type HifzCorpus, type HifzEntry, type HifzUnit } from '@/lib/hifzPlan';
import { readHifzReminder, reminderStorageKey, requestHifzReminderPermission, scheduleHifzReminder } from '@/lib/hifzReminder';
import { surahs } from '@/data/surahs';

const units: Record<HifzUnit, string> = { surah: 'Sourate', pages: 'Pages', juz: 'Juz', quarter: 'Quart de hizb' };
const dateLabel = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
const grades: { grade: SuperMemoGrade; label: string }[] = [
  { grade: 1, label: 'À réapprendre' }, { grade: 3, label: 'Difficile' }, { grade: 4, label: 'Bien' }, { grade: 5, label: 'Sans hésitation' },
];

export function HifzPlanDashboard() {
  const plan = useHifzPlan();
  const [corpus, setCorpus] = useState<HifzCorpus | null>(null);
  const [corpusError, setCorpusError] = useState('');
  const [adding, setAdding] = useState(false);
  const [unit, setUnit] = useState<HifzUnit>('surah');
  const [start, setStart] = useState(1);
  const [end, setEnd] = useState(1);
  const [status, setStatus] = useState<HifzEntry['status']>('memorized');
  const [filter, setFilter] = useState('due');
  const [reviewing, setReviewing] = useState<HifzEntry | null>(null);
  const [reminder, setReminder] = useState(readHifzReminder);
  const [permissionMessage, setPermissionMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const load = () => { setCorpusError(''); loadHifzCorpus().then(setCorpus).catch(() => setCorpusError('Texte indisponible. Reconnectez-vous une fois pour charger les passages.')); };
  useEffect(load, []);
  const limits = { surah: 114, pages: 604, juz: 30, quarter: 240 };
  const ranges = corpus ? resolveHifzRanges(corpus, unit, start, unit === 'surah' ? start : end) : [];
  const label = unit === 'surah' ? (surahs.find(s => s.number === start)?.name ?? '')
    : `${units[unit]} ${start}${start !== end ? `–${end}` : ''}`;
  const add = () => {
    if (!ranges.length) return;
    if (plan.entries.some(e => JSON.stringify(e.ranges) === JSON.stringify(ranges))) { toast.error('Ce passage figure déjà dans votre programme.'); return; }
    if (plan.save(createHifzEntry(label, ranges, unit, status))) { setAdding(false); setFilter('due'); toast.success('Passage ajouté au programme'); }
  };
  const saveReminder = async (enabled: boolean, time = reminder.time) => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return;
    setBusy(true);
    try {
      let granted = true;
      if (enabled && !reminder.enabled) granted = await requestHifzReminderPermission();
      const settings = { enabled, time };
      await scheduleHifzReminder(settings, plan.entries.length > 0);
      localStorage.setItem(reminderStorageKey, JSON.stringify(settings));
      setReminder(settings); window.dispatchEvent(new Event('hifz-reminder-changed'));
      setPermissionMessage(!granted ? 'Notifications non autorisées : le rappel reste visible dans l’application ouverte.' : enabled ? 'Rappel activé' : 'Rappel désactivé');
    } catch { setPermissionMessage('Le rappel n’a pas pu être programmé. Vérifiez les autorisations de notification de votre appareil.'); }
    finally { setBusy(false); }
  };
  const today = localDay();
  const visible = (filter === 'due' ? plan.due : plan.entries.filter(e => filter !== 'learning' || e.status === 'learning'));
  const completedToday = plan.entries.filter(e => e.history.some(h => localDay(new Date(h.date)) === today)).length;
  const memorized = plan.entries.filter(e => e.status === 'memorized').length;
  return <div className="space-y-6">
    <section className="grid grid-cols-3 divide-x divide-border border-y border-border py-4 text-center">
      <div><p className="text-2xl font-bold text-primary">{memorized}</p><p className="text-xs text-muted-foreground">Mémorisés · محفوظ</p></div>
      <div><p className="text-2xl font-bold text-foreground">{plan.due.length}</p><p className="text-xs text-muted-foreground">À réviser · مراجعة</p></div>
      <div><p className="text-2xl font-bold text-primary">{completedToday}</p><p className="text-xs text-muted-foreground">Révisés aujourd’hui</p></div>
    </section>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-lg font-semibold">Mon programme · برنامجي</h2>
      <Button onClick={() => setAdding(true)} disabled={!plan.ready} className="gap-2"><Plus className="h-4 w-4" />Ajouter un passage</Button>
    </div>
    <Tabs value={filter} onValueChange={setFilter}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="due">Aujourd’hui</TabsTrigger><TabsTrigger value="all">Tous</TabsTrigger><TabsTrigger value="learning">En cours</TabsTrigger>
      </TabsList>
    </Tabs>
    {!plan.ready ? <Loader2 className="mx-auto animate-spin" /> : visible.length === 0 ? <div className="py-6 text-center">
      <CalendarCheck className="mx-auto mb-3 h-8 w-8 text-primary" />
      <p className="font-medium">{plan.entries.length ? 'Aucune révision en attente' : 'Votre programme attend son premier passage'}</p>
      {plan.entries.length > 0 && <p className="mt-1 text-sm text-muted-foreground">Prochaine révision : {dateLabel([...plan.entries].sort((a, b) => a.due.localeCompare(b.due))[0].due)}</p>}
    </div> : <div className="space-y-3">{visible.map(entry => <article key={entry.id} className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><h3 className="font-semibold">{entry.label}</h3>
          <p className="text-sm text-muted-foreground">{entry.status === 'learning' ? 'En cours d’apprentissage' : 'Mémorisé'} · {entry.due < today ? 'Révision en retard' : entry.due === today ? 'À réviser aujourd’hui' : `Révision le ${dateLabel(entry.due)}`}</p>
        </div>
        <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground" aria-label={`Supprimer ${entry.label}`} title="Supprimer" onClick={() => { if (window.confirm(`Retirer « ${entry.label} » du programme ?`)) plan.remove(entry.id); }}><Trash2 className="h-4 w-4" /></Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setReviewing(entry)} className="gap-1.5"><Check className="h-4 w-4" />Révision faite</Button>
        <Button size="sm" variant="outline" asChild><Link to={`/hifz?entry=${entry.id}`}><Mic className="mr-1.5 h-4 w-4" />Contrôler</Link></Button>
        <Button size="sm" variant="ghost" asChild><Link to={`/surah/${entry.ranges[0].surah}?verse=${entry.ranges[0].from}`}><BookOpen className="mr-1.5 h-4 w-4" />Lire</Link></Button>
      </div>
      <details className="mt-3 text-sm"><summary className="cursor-pointer text-muted-foreground">Historique ({entry.history.length})</summary>
        {entry.history.length === 0 ? <p className="mt-2">Aucune révision enregistrée.</p> : <ul className="mt-2 space-y-1">{[...entry.history].reverse().map((h, i) => <li key={i} className="flex flex-wrap justify-between gap-2"><span>{new Date(h.date).toLocaleString('fr-FR')}</span><span>{h.score !== undefined ? `${h.score}% · ` : ''}{h.grade < 3 ? 'À reprendre' : h.grade === 3 ? 'Difficile' : h.grade === 4 ? 'Bien' : 'Sans hésitation'}</span></li>)}</ul>}
      </details>
    </article>)}</div>}
    <section className="space-y-3 border-t border-border pt-5">
      <div className="flex items-center justify-between gap-3"><label htmlFor="hifz-reminder" className="flex items-center gap-2 font-semibold"><Bell className="h-4 w-4 text-primary" />Rappel quotidien · تذكير</label><Switch id="hifz-reminder" checked={reminder.enabled} disabled={busy} onCheckedChange={enabled => void saveReminder(enabled)} /></div>
      <label className="flex items-center justify-between gap-3 text-sm">Heure du rappel<Input aria-label="Heure du rappel" type="time" className="w-32" value={reminder.time} disabled={busy} onChange={e => void saveReminder(reminder.enabled, e.target.value)} /></label>
      <p className="text-xs text-muted-foreground">{Capacitor.isNativePlatform() ? 'Notification quotidienne, même lorsque l’application est fermée, selon les autorisations Android.' : 'Sur le site, le rappel apparaît lorsque l’application est ouverte. Les rappels avec l’application fermée nécessitent l’APK Android.'}</p>
      {permissionMessage && <p role="status" className="text-sm">{permissionMessage}</p>}
    </section>
    <p className="text-xs text-muted-foreground" role="status">{plan.syncStatus}</p>
    {plan.storageError && <p role="alert" className="text-sm text-destructive">{plan.storageError}</p>}
    <Dialog open={adding} onOpenChange={setAdding}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Ajouter au programme · إضافة</DialogTitle><DialogDescription>Passage et état d’apprentissage</DialogDescription></DialogHeader>
      <div className="space-y-4">
        <label className="block space-y-1 text-sm"><span>Découpage</span><select className="h-10 w-full rounded-md border border-input bg-background px-3" value={unit} onChange={e => { setUnit(e.target.value as HifzUnit); setStart(1); setEnd(1); }}><option value="surah">Sourate</option><option value="pages">Pages</option><option value="juz">Juz</option><option value="quarter">Quart de hizb</option></select></label>
        {unit === 'surah' ? <label className="block space-y-1 text-sm"><span>Sourate à suivre</span><select className="h-10 w-full rounded-md border border-input bg-background px-3" value={start} onChange={e => setStart(Number(e.target.value))}>{surahs.map(s => <option key={s.number} value={s.number}>{s.number}. {s.name} — {s.nameArabic}</option>)}</select></label>
          : <div className="grid grid-cols-2 gap-3"><label className="text-sm">Début<Input type="number" min={1} max={limits[unit]} value={start} onChange={e => setStart(Number(e.target.value))} /></label><label className="text-sm">Fin<Input type="number" min={start} max={limits[unit]} value={end} onChange={e => setEnd(Number(e.target.value))} /></label></div>}
        <label className="block space-y-1 text-sm"><span>État</span><select className="h-10 w-full rounded-md border border-input bg-background px-3" value={status} onChange={e => setStatus(e.target.value as HifzEntry['status'])}><option value="memorized">Mémorisé · محفوظ</option><option value="learning">En cours · قيد الحفظ</option></select></label>
        {corpusError ? <div role="alert"><p className="text-sm text-destructive">{corpusError}</p><Button variant="outline" size="sm" onClick={load}>Réessayer</Button></div> : !corpus ? <Loader2 className="animate-spin" /> : !ranges.length && <p role="alert" className="text-sm text-destructive">Choisissez une plage valide entre 1 et {limits[unit]}.</p>}
        <Button onClick={add} disabled={!ranges.length} className="w-full">Ajouter</Button>
      </div>
    </DialogContent></Dialog>
    <Dialog open={reviewing !== null} onOpenChange={open => { if (!open) setReviewing(null); }}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Révision : {reviewing?.label}</DialogTitle><DialogDescription>Comment s’est passée votre récitation de mémoire ?</DialogDescription></DialogHeader><div className="grid grid-cols-2 gap-2">{grades.map(g => <Button key={g.grade} variant="outline" onClick={() => { if (reviewing && plan.review(reviewing.id, g.grade)) { setReviewing(null); toast.success('Révision enregistrée · prochaine date ajustée'); } }}>{g.label}</Button>)}</div></DialogContent></Dialog>
  </div>;
}