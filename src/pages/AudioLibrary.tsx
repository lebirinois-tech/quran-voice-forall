import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Download, Search, Music, Upload, Play, Pause, Clock, FileAudio, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

type AudioCategory = 'all' | 'recitation' | 'cours' | 'doua' | 'autre';

const CATEGORY_LABELS: Record<string, string> = {
  recitation: '🎙️ Récitation',
  cours: '📚 Cours',
  doua: '🤲 Doua',
  autre: '📁 Autre',
};

interface AudioItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_url: string;
  file_size: number | null;
  duration_seconds: number | null;
  created_at: string;
}

const formatSize = (bytes: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDuration = (seconds: number | null) => {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const AudioLibrary = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const appSettings = useAppSettings();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<AudioCategory>('all');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioEl] = useState(() => new Audio());

  const { data: audios = [], isLoading } = useQuery({
    queryKey: ['audio-downloads', category],
    queryFn: async () => {
      let query = supabase.from('audio_downloads').select('*').order('created_at', { ascending: false });
      if (category !== 'all') {
        query = query.eq('category', category);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as AudioItem[];
    },
  });

  const filtered = audios.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    (a.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const handlePlay = (item: AudioItem) => {
    if (playingId === item.id) {
      audioEl.pause();
      setPlayingId(null);
    } else {
      audioEl.src = item.file_url;
      audioEl.play().catch(() => toast.error('Impossible de lire cet audio'));
      setPlayingId(item.id);
      audioEl.onended = () => setPlayingId(null);
    }
  };

  const handleDownload = async (item: AudioItem) => {
    try {
      const res = await fetch(item.file_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.title}.mp3`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Téléchargement lancé !');
    } catch {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const categories: { id: AudioCategory; label: string }[] = [
    { id: 'all', label: '🔊 Tout' },
    { id: 'recitation', label: '🎙️ Récitations' },
    { id: 'cours', label: '📚 Cours' },
    { id: 'doua', label: '🤲 Douas' },
    { id: 'autre', label: '📁 Autre' },
  ];

  return (
    <div className="min-h-screen pattern-islamic" style={{ backgroundColor: appSettings.backgroundColor }}>
      <Header
        showBackButton
        reciter={appSettings.reciter}
        onReciterChange={appSettings.onReciterChange}
        backgroundColor={appSettings.backgroundColor}
        onBackgroundColorChange={appSettings.onBackgroundColorChange}
        textDisplayStyle={appSettings.textDisplayStyle}
        onTextDisplayStyleChange={appSettings.onTextDisplayStyleChange}
      />

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Title */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Music className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Bibliothèque Audio</h1>
              <p className="text-xs text-muted-foreground">المكتبة الصوتية</p>
            </div>
          </div>
          {isAuthenticated && (
            <Link to="/audio-upload">
              <Button size="sm" className="gap-2">
                <Upload className="h-4 w-4" />
                Ajouter
              </Button>
            </Link>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                category === c.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un audio..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FileAudio className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun audio disponible</p>
            {isAuthenticated && (
              <Link to="/audio-upload">
                <Button variant="outline" className="mt-4 gap-2">
                  <Upload className="h-4 w-4" />
                  Ajouter le premier audio
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(item => (
              <div
                key={item.id}
                className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 card-hover"
              >
                {/* Play button */}
                <button
                  onClick={() => handlePlay(item)}
                  className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 hover:bg-primary/20 transition-colors"
                >
                  {playingId === item.id ? (
                    <Pause className="h-4 w-4 text-primary" />
                  ) : (
                    <Play className="h-4 w-4 text-primary ml-0.5" />
                  )}
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{item.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span className="px-1.5 py-0.5 bg-muted rounded text-[10px]">
                      {CATEGORY_LABELS[item.category] || item.category}
                    </span>
                    {item.duration_seconds && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(item.duration_seconds)}
                      </span>
                    )}
                    {item.file_size && (
                      <span>{formatSize(item.file_size)}</span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.description}</p>
                  )}
                </div>

                {/* Download */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDownload(item)}
                  className="flex-shrink-0"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AudioLibrary;
