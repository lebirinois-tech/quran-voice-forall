import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Play, Pause, Save, Trash2, Loader2, BrainCircuit } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { cn } from '@/lib/utils';
import { useRecordingStorage } from '@/hooks/useRecordingStorage';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface VerseRecorderProps {
  surahNumber: number;
  verseNumber: number;
  verseText: string;
  /** Label shown next to controls */
  label?: string;
}

interface ComparisonResult {
  score: number;
  feedback: string;
  details?: string;
}

export const VerseRecorder = ({ surahNumber, verseNumber, verseText, label }: VerseRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { savedRecording, saveRecording, deleteRecording } = useRecordingStorage(surahNumber, verseNumber);
  const activeBlob = recordedBlob || savedRecording;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        setRecordedBlob(blob);
        stream.getTracks().forEach(t => t.stop());
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setIsExpanded(true);
      setRecordingDuration(0);
      setComparisonResult(null);
      timerRef.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
    } catch {
      toast.error("Impossible d'accéder au microphone");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    setIsRecording(false);
  }, []);

  const playRecording = useCallback(() => {
    if (!activeBlob) return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    const url = URL.createObjectURL(activeBlob);
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => { setIsPlayingRecording(false); URL.revokeObjectURL(url); };
    audio.play();
    setIsPlayingRecording(true);
  }, [activeBlob]);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setIsPlayingRecording(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!recordedBlob) return;
    await saveRecording(recordedBlob);
    toast.success('Enregistrement sauvegardé sur l\'appareil');
  }, [recordedBlob, saveRecording]);

  const handleDelete = useCallback(async () => {
    await deleteRecording();
    setRecordedBlob(null);
    setComparisonResult(null);
    toast.success('Enregistrement supprimé');
  }, [deleteRecording]);

  const handleCompare = useCallback(async () => {
    if (!activeBlob) return;
    setIsComparing(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(activeBlob);
      });
      const { data, error } = await supabase.functions.invoke('compare-recitation', {
        body: { audioBase64: base64, mimeType: activeBlob.type, verseText, surahNumber, verseNumber },
      });
      if (error) throw error;
      setComparisonResult(data as ComparisonResult);
    } catch (err) {
      console.error('Comparison error:', err);
      toast.error("Erreur lors de l'analyse IA");
    } finally {
      setIsComparing(false);
    }
  }, [activeBlob, verseText, surahNumber, verseNumber]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-destructive';
  };

  const hasSaved = !!savedRecording && !recordedBlob;

  return (
    <div className="bg-card border border-border rounded-xl p-3 space-y-2">
      {/* Header row: toggle + quick record */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="gap-1.5 text-xs font-medium"
        >
          <Mic className={cn("h-4 w-4", hasSaved ? "text-primary" : "text-muted-foreground")} />
          {label || 'Mémorisation'}
          {hasSaved && <span className="text-[10px] bg-primary/10 text-primary px-1.5 rounded-full">📁</span>}
        </Button>

        {!isExpanded && !isRecording && (
          <Button variant="outline" size="sm" onClick={() => { setIsExpanded(true); startRecording(); }} className="gap-1 text-xs ml-auto">
            <Mic className="h-3.5 w-3.5 text-destructive" />
            Enregistrer
          </Button>
        )}

        {isRecording && (
          <Button variant="destructive" size="sm" onClick={stopRecording} className="gap-1 text-xs ml-auto animate-pulse">
            <Square className="h-3 w-3" />
            Arrêter ({formatTime(recordingDuration)})
          </Button>
        )}
      </div>

      {/* Expanded controls */}
      {isExpanded && !isRecording && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            {!activeBlob && (
              <Button variant="outline" size="sm" onClick={startRecording} className="gap-1.5 text-xs">
                <Mic className="h-3.5 w-3.5 text-destructive" />
                Enregistrer ma récitation
              </Button>
            )}

            {activeBlob && (
              <>
                <Button variant="ghost" size="icon" onClick={isPlayingRecording ? stopPlayback : playRecording} className="h-8 w-8">
                  {isPlayingRecording ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>

                {recordedBlob && (
                  <Button variant="ghost" size="sm" onClick={handleSave} className="gap-1 text-xs">
                    <Save className="h-3.5 w-3.5" />
                    Sauvegarder
                  </Button>
                )}

                <Button variant="ghost" size="sm" onClick={handleCompare} disabled={isComparing} className="gap-1 text-xs">
                  {isComparing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BrainCircuit className="h-3.5 w-3.5" />}
                  Comparer IA
                </Button>

                <Button variant="ghost" size="icon" onClick={handleDelete} className="h-8 w-8 text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>

                <Button variant="outline" size="sm" onClick={startRecording} className="gap-1 text-xs ml-auto">
                  <Mic className="h-3.5 w-3.5 text-destructive" />
                  Réenregistrer
                </Button>
              </>
            )}
          </div>

          {/* AI Comparison result */}
          {comparisonResult && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-primary" />
                <span className="font-medium">Résultat</span>
                <span className={cn("font-bold text-lg ml-auto", getScoreColor(comparisonResult.score))}>
                  {comparisonResult.score}/100
                </span>
              </div>
              <Progress value={comparisonResult.score} className="h-2" />
              <p className="text-muted-foreground">{comparisonResult.feedback}</p>
              {comparisonResult.details && (
                <p className="text-xs text-muted-foreground/80">{comparisonResult.details}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
