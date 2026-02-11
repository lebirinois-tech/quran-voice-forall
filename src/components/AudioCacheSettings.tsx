import { useState } from 'react';
import { Download, Check, Loader2, Wifi } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { useAudioCache, isSurahCached, getCachedSurahCount } from '@/hooks/useAudioCache';
import { RECITERS, ReciterId } from '@/hooks/useQuranAudio';
import { surahs } from '@/data/surahs';
import { toast } from 'sonner';
import { ScrollArea } from './ui/scroll-area';

const DOWNLOADABLE_RECITERS: { id: ReciterId; label: string }[] = [
  { id: 'alafasy', label: '🟢 Mishary Alafasy (Hafs)' },
  { id: 'yassinJazaeryWarsh', label: '🟠 Yassin Al-Jazaery (Warsh)' },
];

export const AudioCacheSettings = () => {
  const { downloadSurahAudio, downloadAllSurahs, isDownloading, downloadingSurah, downloadingReciter, progress } = useAudioCache();
  const [selectedReciter, setSelectedReciter] = useState<ReciterId>('alafasy');
  const [showSurahList, setShowSurahList] = useState(false);

  const cachedCount = getCachedSurahCount(selectedReciter);

  const handleDownloadAll = async () => {
    toast.info(`Téléchargement du Coran complet — ${RECITERS[selectedReciter].name}`);
    await downloadAllSurahs(selectedReciter);
    toast.success('Téléchargement terminé !');
  };

  const handleDownloadSurah = async (surahNum: number) => {
    await downloadSurahAudio(selectedReciter, surahNum);
    toast.success(`Sourate ${surahNum} mise en cache`);
  };

  return (
    <div className="space-y-3">
      <Label className="text-foreground flex items-center gap-2 text-sm font-semibold">
        <Wifi className="h-3.5 w-3.5 text-primary" />
        Pré-téléchargement hors-ligne / التحميل المسبق
      </Label>

      {/* Reciter selector */}
      <div className="flex gap-1.5">
        {DOWNLOADABLE_RECITERS.map((r) => (
          <button
            key={r.id}
            onClick={() => { setSelectedReciter(r.id); setShowSurahList(false); }}
            className={`flex-1 p-2 rounded-lg border-2 text-xs font-medium transition-all ${
              selectedReciter === r.id
                ? 'border-primary ring-2 ring-primary/30 bg-primary/10 text-foreground'
                : 'border-border hover:border-primary/50 bg-muted/50 text-foreground'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Status */}
      <p className="text-xs text-muted-foreground">
        {cachedCount}/114 sourates en cache
      </p>

      {/* Progress bar during download */}
      {isDownloading && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Sourate {downloadingSurah} — {progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          onClick={handleDownloadAll}
          disabled={isDownloading}
        >
          <Download className="h-3.5 w-3.5 mr-1" />
          Tout télécharger
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          onClick={() => setShowSurahList(!showSurahList)}
          disabled={isDownloading}
        >
          {showSurahList ? 'Masquer' : 'Par sourate'}
        </Button>
      </div>

      {/* Surah-by-surah list */}
      {showSurahList && (
        <ScrollArea className="h-48 border border-border rounded-lg">
          <div className="p-1 space-y-0.5">
            {surahs.map((s) => {
              const cached = isSurahCached(selectedReciter, s.number);
              return (
                <button
                  key={s.number}
                  onClick={() => !cached && !isDownloading && handleDownloadSurah(s.number)}
                  disabled={cached || isDownloading}
                  className={`w-full flex items-center justify-between p-1.5 rounded text-xs transition-colors ${
                    cached
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted/80 text-foreground'
                  }`}
                >
                  <span className="truncate">
                    {s.number}. {s.name} — {s.nameArabic}
                  </span>
                  {cached ? (
                    <Check className="h-3 w-3 text-primary flex-shrink-0" />
                  ) : (
                    downloadingSurah === s.number && downloadingReciter === selectedReciter ? (
                      <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" />
                    ) : (
                      <Download className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    )
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
