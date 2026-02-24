import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Play, Pause, Save, Trash2, Loader2, BrainCircuit, SaveAll } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { cn } from '@/lib/utils';
import { useRecordingStorage } from '@/hooks/useRecordingStorage';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ReciterId } from '@/hooks/useQuranAudio';

interface VerseRecorderProps {
  surahNumber: number;
  verseNumber: number;
  verseText: string;
  label?: string;
  reciter?: ReciterId;
  onRecordingChange?: (isRecording: boolean) => void;
}

interface ComparisonResult {
  score: number;
  feedback: string;
  details?: string;
}

export const VerseRecorder = ({ surahNumber, verseNumber, verseText, label, onRecordingChange }: VerseRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [echoEnabled, setEchoEnabled] = useState(false);
  const [echoIntensity, setEchoIntensity] = useState(50); // 0-100

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  const { savedRecording, saveRecording, deleteRecording } = useRecordingStorage(surahNumber, verseNumber);
  const activeBlob = recordedBlob || savedRecording;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (sourceNodeRef.current) { try { sourceNodeRef.current.stop(); } catch {} }
      if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
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
      onRecordingChange?.(true);
      setRecordingDuration(0);
      setComparisonResult(null);
      timerRef.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
    } catch {
      toast.error("Impossible d'accéder au microphone");
    }
  }, [onRecordingChange]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    setIsRecording(false);
    onRecordingChange?.(false);
  }, [onRecordingChange]);

  const stopPlayback = useCallback(() => {
    if (sourceNodeRef.current) { try { sourceNodeRef.current.stop(); } catch {} sourceNodeRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    setIsPlayingRecording(false);
  }, []);

  const playRecording = useCallback(async () => {
    if (!activeBlob) return;
    stopPlayback();

    try {
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const arrayBuffer = await activeBlob.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      sourceNodeRef.current = source;

      if (echoEnabled) {
        const intensity = echoIntensity / 100;
        const delay = ctx.createDelay(1.0);
        delay.delayTime.value = 0.2 + intensity * 0.4; // 0.2s - 0.6s

        const feedback = ctx.createGain();
        feedback.gain.value = 0.3 + intensity * 0.45; // 0.3 - 0.75

        const wetGain = ctx.createGain();
        wetGain.gain.value = 0.3 + intensity * 0.6; // 0.3 - 0.9

        // Source -> destination (dry)
        source.connect(ctx.destination);

        // Source -> delay -> wetGain -> destination
        source.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay); // feedback loop
        delay.connect(wetGain);
        wetGain.connect(ctx.destination);
      } else {
        source.connect(ctx.destination);
      }

      source.onended = () => {
        setIsPlayingRecording(false);
        ctx.close();
        audioContextRef.current = null;
        sourceNodeRef.current = null;
      };

      source.start();
      setIsPlayingRecording(true);
    } catch (err) {
      console.error('Playback error:', err);
      toast.error("Erreur de lecture");
    }
  }, [activeBlob, echoEnabled, echoIntensity, stopPlayback]);

  // Helper: render blob with echo effect using OfflineAudioContext
  const applyEchoToBlob = useCallback(async (blob: Blob): Promise<Blob> => {
    const arrayBuffer = await blob.arrayBuffer();
    const tempCtx = new AudioContext();
    const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
    await tempCtx.close();

    const sr = audioBuffer.sampleRate;
    const intensity = echoIntensity / 100;
    const delayTime = 0.2 + intensity * 0.4;
    const duration = audioBuffer.duration + delayTime * 4; // extra time for echo tail

    const offline = new OfflineAudioContext(audioBuffer.numberOfChannels, Math.ceil(duration * sr), sr);

    const source = offline.createBufferSource();
    source.buffer = audioBuffer;

    const delay = offline.createDelay(1.0);
    delay.delayTime.value = delayTime;
    const feedback = offline.createGain();
    feedback.gain.value = 0.3 + intensity * 0.45;
    const wetGain = offline.createGain();
    wetGain.gain.value = 0.3 + intensity * 0.6;

    source.connect(offline.destination);
    source.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wetGain);
    wetGain.connect(offline.destination);

    source.start();
    const rendered = await offline.startRendering();

    // Encode to WAV
    const numCh = rendered.numberOfChannels;
    const length = rendered.length;
    const wavBuffer = new ArrayBuffer(44 + length * numCh * 2);
    const view = new DataView(wavBuffer);
    const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + length * numCh * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numCh, true);
    view.setUint32(24, sr, true);
    view.setUint32(28, sr * numCh * 2, true);
    view.setUint16(32, numCh * 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, length * numCh * 2, true);

    let offset = 44;
    const channels = Array.from({ length: numCh }, (_, i) => rendered.getChannelData(i));
    for (let i = 0; i < length; i++) {
      for (let ch = 0; ch < numCh; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([wavBuffer], { type: 'audio/wav' });
  }, [echoIntensity]);

  const handleSave = useCallback(async () => {
    if (!recordedBlob) return;
    await saveRecording(recordedBlob);
    toast.success('Enregistrement sauvegardé');
  }, [recordedBlob, saveRecording]);

  const handleSaveWithEcho = useCallback(async () => {
    if (!activeBlob) return;
    try {
      const echoBlob = await applyEchoToBlob(activeBlob);
      await saveRecording(echoBlob);
      setRecordedBlob(null); // clear unsaved, now saved version has echo
      toast.success('Sauvegardé avec écho');
    } catch (err) {
      console.error('Echo save error:', err);
      toast.error("Erreur lors de l'application de l'écho");
    }
  }, [activeBlob, applyEchoToBlob, saveRecording]);

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
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="gap-1.5 text-xs font-medium">
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

      {isExpanded && !isRecording && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            {!activeBlob && (
              <Button variant="outline" size="sm" onClick={startRecording} className="gap-1.5 text-xs">
                <Mic className="h-3.5 w-3.5 text-destructive" />
                Enregistrer
              </Button>
            )}

            {activeBlob && (
              <>
                <Button variant="ghost" size="icon" onClick={isPlayingRecording ? stopPlayback : playRecording} className="h-8 w-8">
                  {isPlayingRecording ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>

                {/* Echo toggle + slider */}
                <div className="flex items-center gap-1.5">
                  <Switch id={`echo-${surahNumber}-${verseNumber}`} checked={echoEnabled} onCheckedChange={setEchoEnabled} className="scale-75" />
                  <Label htmlFor={`echo-${surahNumber}-${verseNumber}`} className="text-[11px] text-muted-foreground cursor-pointer">
                    Écho
                  </Label>
                </div>

                {echoEnabled && (
                  <div className="flex items-center gap-2 min-w-[100px]">
                    <Slider
                      value={[echoIntensity]}
                      onValueChange={([v]) => setEchoIntensity(v)}
                      min={10}
                      max={100}
                      step={5}
                      className="w-20"
                    />
                    <span className="text-[10px] text-muted-foreground w-6">{echoIntensity}%</span>
                  </div>
                )}

                {recordedBlob && (
                  <Button variant="ghost" size="sm" onClick={handleSave} className="gap-1 text-xs">
                    <Save className="h-3.5 w-3.5" />
                    Sauvegarder
                  </Button>
                )}

                {activeBlob && echoEnabled && (
                  <Button variant="ghost" size="sm" onClick={handleSaveWithEcho} className="gap-1 text-xs text-primary">
                    <SaveAll className="h-3.5 w-3.5" />
                    Sauver + Écho
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
