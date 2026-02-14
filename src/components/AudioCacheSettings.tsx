import { useState } from 'react';
import { Download, Check, Loader2, Wifi, BookOpen, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { useAudioCache, isSurahCached, getCachedSurahCount } from '@/hooks/useAudioCache';
import { useTafsirCache, isTafsirSurahCached, getCachedTafsirSurahCount } from '@/hooks/useTafsirCache';
import { useTextCache, isTextSurahCached, getCachedTextSurahCount } from '@/hooks/useTextCache';
import { RECITERS, ReciterId } from '@/hooks/useQuranAudio';
import { surahs } from '@/data/surahs';
import { toast } from 'sonner';
import { ScrollArea } from './ui/scroll-area';

const DOWNLOADABLE_RECITERS: { id: ReciterId; label: string }[] = [
  { id: 'alafasy', label: '🟢 Mishary Alafasy (Hafs)' },
  { id: 'yassinJazaeryWarsh', label: '🟠 Yassin Al-Jazaery (Warsh)' },
];

type DownloadTab = 'audio' | 'text' | 'tafsir';

export const AudioCacheSettings = () => {
  const { downloadSurahAudio, downloadAllSurahs, isDownloading: isAudioDownloading, downloadingSurah: audioDownloadingSurah, downloadingReciter, progress: audioProgress } = useAudioCache();
  const { downloadSurahTafsir, downloadAllTafsir, isDownloading: isTafsirDownloading, downloadingSurah: tafsirDownloadingSurah, progress: tafsirProgress } = useTafsirCache();
  const { downloadSurahText, downloadAllText, isDownloading: isTextDownloading, downloadingSurah: textDownloadingSurah, progress: textProgress } = useTextCache();

  const [selectedReciter, setSelectedReciter] = useState<ReciterId>('alafasy');
  const [showSurahList, setShowSurahList] = useState(false);
  const [activeTab, setActiveTab] = useState<DownloadTab>('audio');

  const audioCachedCount = getCachedSurahCount(selectedReciter);
  const textCachedCount = getCachedTextSurahCount();
  const tafsirCachedCount = getCachedTafsirSurahCount();

  const isDownloading = isAudioDownloading || isTafsirDownloading || isTextDownloading;

  const handleDownloadAll = async () => {
    if (activeTab === 'audio') {
      toast.info(`Téléchargement audio — ${RECITERS[selectedReciter].name}`);
      await downloadAllSurahs(selectedReciter);
      toast.success('Audio téléchargé !');
    } else if (activeTab === 'text') {
      toast.info('Téléchargement du texte coranique...');
      await downloadAllText();
      toast.success('Texte téléchargé !');
    } else {
      toast.info('Téléchargement du Tafsir...');
      await downloadAllTafsir();
      toast.success('Tafsir téléchargé !');
    }
  };

  const handleDownloadSurah = async (surahNum: number) => {
    if (activeTab === 'audio') {
      await downloadSurahAudio(selectedReciter, surahNum);
      toast.success(`Audio sourate ${surahNum} en cache`);
    } else if (activeTab === 'text') {
      await downloadSurahText(surahNum);
      toast.success(`Texte sourate ${surahNum} en cache`);
    } else {
      await downloadSurahTafsir(surahNum);
      toast.success(`Tafsir sourate ${surahNum} en cache`);
    }
  };

  const isSurahDone = (surahNum: number) => {
    if (activeTab === 'audio') return isSurahCached(selectedReciter, surahNum);
    if (activeTab === 'text') return isTextSurahCached(surahNum);
    return isTafsirSurahCached(surahNum);
  };

  const currentDownloadingSurah = activeTab === 'audio' ? audioDownloadingSurah : activeTab === 'text' ? textDownloadingSurah : tafsirDownloadingSurah;
  const currentProgress = activeTab === 'audio' ? audioProgress : activeTab === 'text' ? textProgress : tafsirProgress;
  const currentCachedCount = activeTab === 'audio' ? audioCachedCount : activeTab === 'text' ? textCachedCount : tafsirCachedCount;

  const tabs: { id: DownloadTab; label: string; icon: React.ReactNode }[] = [
    { id: 'audio', label: 'Audio', icon: <Download className="h-3 w-3" /> },
    { id: 'text', label: 'Texte', icon: <FileText className="h-3 w-3" /> },
    { id: 'tafsir', label: 'Tafsir', icon: <BookOpen className="h-3 w-3" /> },
  ];

  return (
    <div className="space-y-3">
      <Label className="text-foreground flex items-center gap-2 text-sm font-semibold">
        <Wifi className="h-3.5 w-3.5 text-primary" />
        Pré-téléchargement hors-ligne / التحميل المسبق
      </Label>

      {/* Tab selector */}
      <div className="flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setShowSurahList(false); }}
            className={`flex-1 flex items-center justify-center gap-1 p-2 rounded-lg border-2 text-xs font-medium transition-all ${
              activeTab === tab.id
                ? 'border-primary ring-2 ring-primary/30 bg-primary/10 text-foreground'
                : 'border-border hover:border-primary/50 bg-muted/50 text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reciter selector (only for audio) */}
      {activeTab === 'audio' && (
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
      )}

      {/* Status */}
      <p className="text-xs text-muted-foreground">
        {currentCachedCount}/114 sourates en cache
      </p>

      {/* Progress bar during download */}
      {isDownloading && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Sourate {currentDownloadingSurah} — {currentProgress}%</span>
          </div>
          <Progress value={currentProgress} className="h-2" />
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
              const cached = isSurahDone(s.number);
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
                    currentDownloadingSurah === s.number ? (
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
