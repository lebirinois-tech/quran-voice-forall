import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Upload, FileAudio, Loader2, ArrowLeft, X, Lock, KeyRound, FolderOpen } from 'lucide-react';
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
  const appSettings = useAppSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('recitation');
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);

  const [accessCode, setAccessCode] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerifyCode = async () => {
    if (!accessCode.trim()) return;
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-upload-code', {
        body: { code: accessCode.trim() },
      });
      if (error) throw error;
      if (data?.valid) {
        setIsVerified(true);
        toast.success('Code vérifié ! Vous pouvez ajouter du contenu.');
      } else {
        toast.error('Code d\'accès incorrect');
      }
    } catch {
      toast.error('Erreur lors de la vérification');
    } finally {
      setIsVerifying(false);
    }
  };

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

  if (!isVerified) {
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
        <main className="container mx-auto px-4 py-8 max-w-md">
          <div className="text-center mb-8 animate-fade-in">
            <div className="w-20 h-20 mx-auto mb-4 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
              <Lock className="h-10 w-10 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Accès protégé</h1>
            <p className="text-sm text-muted-foreground">
              Entrez le code d'accès pour ajouter du contenu au site
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-4 animate-scale-in">
            <div className="space-y-2">
              <Label htmlFor="accessCode" className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                Code d'accès
              </Label>
              <Input
                id="accessCode"
                type="password"
                placeholder="••••••••"
                value={accessCode}
                onChange={e => setAccessCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleVerifyCode()}
              />
            </div>
            <Button
              onClick={handleVerifyCode}
              disabled={!accessCode.trim() || isVerifying}
              className="w-full"
            >
              {isVerifying ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Vérification...
                </span>
              ) : (
                'Vérifier le code'
              )}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const isAudioFile = (f: File) => {
    if (f.type.startsWith('audio/')) return true;
    const ext = f.name.split('.').pop()?.toLowerCase() || '';
    return ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'wma', 'flac', 'opus', 'webm'].includes(ext);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputFiles = e.target.files;
    if (!inputFiles || inputFiles.length === 0) return;

    const audioFiles = Array.from(inputFiles).filter(isAudioFile);

    if (audioFiles.length === 0) {
      toast.error('Aucun fichier audio trouvé. Formats supportés : MP3, WAV, M4A, AAC, OGG, FLAC');
      return;
    }

    const oversized = audioFiles.filter(f => f.size > 50 * 1024 * 1024);
    if (oversized.length > 0) {
      toast.error(`${oversized.length} fichier(s) dépassent 50 Mo et seront ignorés`);
    }

    const validFiles = audioFiles.filter(f => f.size <= 50 * 1024 * 1024);
    if (validFiles.length === 0) return;

    setFiles(validFiles);
    if (!title && validFiles.length === 1) {
      setTitle(validFiles[0].name.replace(/\.[^.]+$/, ''));
    }

    if (validFiles.length > 1) {
      toast.success(`${validFiles.length} fichiers audio sélectionnés`);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0 || !user) return;
    // For single file, title is required; for multi, use file names
    if (files.length === 1 && !title.trim()) return;

    setIsUploading(true);
    setProgress(0);
    setUploadedCount(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const currentFile = files[i];
        const fileTitle = files.length === 1 ? title.trim() : currentFile.name.replace(/\.[^.]+$/, '');

        const ext = currentFile.name.split('.').pop() || 'mp3';
        const fileName = `${Date.now()}_${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('audio-downloads')
          .upload(fileName, currentFile, { contentType: currentFile.type });

        if (uploadError) {
          console.error(`Upload error for ${currentFile.name}:`, uploadError);
          toast.error(`Erreur pour "${currentFile.name}"`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('audio-downloads')
          .getPublicUrl(fileName);

        let durationSeconds: number | null = null;
        try {
          const audio = new Audio();
          audio.src = URL.createObjectURL(currentFile);
          await new Promise<void>((resolve) => {
            audio.onloadedmetadata = () => { durationSeconds = Math.round(audio.duration); resolve(); };
            audio.onerror = () => resolve();
            setTimeout(resolve, 3000);
          });
        } catch {}

        await supabase.from('audio_downloads').insert({
          title: fileTitle,
          description: description.trim() || null,
          category,
          file_url: urlData.publicUrl,
          file_size: currentFile.size,
          duration_seconds: durationSeconds,
          uploaded_by: user.id,
        });

        setUploadedCount(i + 1);
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }

      toast.success(`${files.length > 1 ? `${files.length} audios ajoutés` : 'Audio ajouté'} avec succès !`);
      navigate('/audio-library');
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err.message || 'Erreur lors de l\'upload');
    } finally {
      setIsUploading(false);
      setProgress(0);
      setUploadedCount(0);
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
            {files.length > 0 ? (
              <div className="space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                    <FileAudio className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">{f.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(f.size / (1024 * 1024)).toFixed(1)} Mo
                      </p>
                    </div>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="w-full" onClick={() => { setFiles([]); if (fileRef.current) fileRef.current.value = ''; if (folderRef.current) folderRef.current.value = ''; }}>
                  <X className="h-4 w-4 mr-1" /> Retirer {files.length > 1 ? `les ${files.length} fichiers` : 'le fichier'}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <Upload className="h-7 w-7" />
                  <span className="text-sm font-medium">Sélectionner un fichier audio</span>
                  <span className="text-xs">MP3, WAV, M4A, AAC, OGG, FLAC — max 50 Mo</span>
                </button>
                <button
                  onClick={() => folderRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-xl p-4 flex items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <FolderOpen className="h-5 w-5" />
                  <span className="text-sm">Parcourir un dossier</span>
                </button>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.wma,.flac,.opus"
              className="hidden"
              multiple
              onChange={handleFileChange}
            />
            {/* @ts-ignore - webkitdirectory is not in React types */}
            <input
              ref={folderRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.wma,.flac,.opus"
              className="hidden"
              onChange={handleFileChange}
              {...{ webkitdirectory: '', directory: '' } as any}
            />
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-sm font-medium mb-2 block">Titre</Label>
            <Input
              id="title"
              placeholder="Ex: Sourate Al-Kahf — Sheikh Mishary"
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
                <p className="text-sm font-medium text-foreground">
                  Upload en cours... {files.length > 1 ? `(${uploadedCount}/${files.length})` : ''}
                </p>
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
            disabled={files.length === 0 || (files.length === 1 && !title.trim()) || isUploading}
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
                {files.length > 1 ? `Ajouter ${files.length} audios` : 'Ajouter l\'audio'}
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default AudioUpload;
