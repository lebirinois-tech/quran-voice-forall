import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsOwner } from '@/hooks/useIsOwner';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Upload, FileAudio, Loader2, ArrowLeft, X } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  { id: 'recitation', label: '🎙️ Récitation coranique' },
  { id: 'cours', label: '📚 Cours / Leçon' },
  { id: 'doua', label: '🤲 Doua / Invocation' },
  { id: 'autre', label: '📁 Autre' },
];

const AudioUpload = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { isOwner, loading: ownerLoading } = useIsOwner();
  const appSettings = useAppSettings();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('recitation');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pattern-islamic flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Vous devez être connecté pour ajouter des audios</p>
          <Button onClick={() => navigate('/auth')}>Se connecter</Button>
        </div>
      </div>
    );
  }

  if (ownerLoading) {
    return (
      <div className="min-h-screen pattern-islamic flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen pattern-islamic flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-foreground font-medium mb-2">Accès réservé</p>
          <p className="text-muted-foreground text-sm mb-4">
            Seul le propriétaire de l'application peut ajouter, modifier ou supprimer des audios.
          </p>
          <Button variant="outline" onClick={() => navigate('/audio-library')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la bibliothèque
          </Button>
        </div>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('audio/')) {
      toast.error('Veuillez sélectionner un fichier audio');
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      toast.error('Le fichier ne doit pas dépasser 50 Mo');
      return;
    }
    setFile(f);
    if (!title) {
      setTitle(f.name.replace(/\.[^.]+$/, ''));
    }
  };

  const handleUpload = async () => {
    if (!file || !title.trim() || !user) return;

    setIsUploading(true);
    setProgress(10);

    try {
      // Upload to storage
      const ext = file.name.split('.').pop() || 'mp3';
      const fileName = `${Date.now()}_${crypto.randomUUID()}.${ext}`;

      setProgress(30);

      const { error: uploadError } = await supabase.storage
        .from('audio-downloads')
        .upload(fileName, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      setProgress(70);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('audio-downloads')
        .getPublicUrl(fileName);

      // Get audio duration
      let durationSeconds: number | null = null;
      try {
        const audio = new Audio();
        audio.src = URL.createObjectURL(file);
        await new Promise<void>((resolve) => {
          audio.onloadedmetadata = () => {
            durationSeconds = Math.round(audio.duration);
            resolve();
          };
          audio.onerror = () => resolve();
          setTimeout(resolve, 3000);
        });
      } catch {}

      // Insert metadata
      const { error: insertError } = await supabase.from('audio_downloads').insert({
        title: title.trim(),
        description: description.trim() || null,
        category,
        file_url: urlData.publicUrl,
        file_size: file.size,
        duration_seconds: durationSeconds,
        uploaded_by: user.id,
      });

      if (insertError) throw insertError;

      setProgress(100);
      toast.success('Audio ajouté avec succès !');
      navigate('/audio-library');
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err.message || 'Erreur lors de l\'upload');
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

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

      <main className="container mx-auto px-4 py-6 max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Ajouter un audio</h1>
            <p className="text-xs text-muted-foreground">إضافة ملف صوتي</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* File picker */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Fichier audio</Label>
            {file ? (
              <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                <FileAudio className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(1)} Mo
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-3 text-muted-foreground hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <Upload className="h-8 w-8" />
                <span className="text-sm">Cliquez pour sélectionner un fichier audio</span>
                <span className="text-xs">MP3, WAV, M4A — max 50 Mo</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-sm font-medium mb-2 block">Titre</Label>
            <Input
              id="title"
              placeholder="Ex: Sourate Al-Kahf — Husary"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="bg-card"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="desc" className="text-sm font-medium mb-2 block">Description (optionnel)</Label>
            <Input
              id="desc"
              placeholder="Ex: Récitation complète avec tajweed"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="bg-card"
            />
          </div>

          {/* Category */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Catégorie</Label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    category === c.id
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Upload progress */}
          {isUploading && (
            <div className="bg-primary/10 rounded-xl p-4 flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Upload en cours...</p>
                <div className="h-2 bg-muted rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <Button
            onClick={handleUpload}
            disabled={!file || !title.trim() || isUploading}
            className="w-full gap-2"
            size="lg"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Upload en cours...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Ajouter l'audio
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default AudioUpload;
