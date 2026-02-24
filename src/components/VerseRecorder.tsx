import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Play, Pause, Save, Trash2, Loader2, BrainCircuit } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { cn } from '@/lib/utils';
import { useRecordingStorage } from '@/hooks/useRecordingStorage';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { RECITERS, ReciterId } from '@/hooks/useQuranAudio';

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

/**
 * Mix a user recording blob with the sheikh's audio into a single blob.
 * Uses OfflineAudioContext to render both sources into one buffer.
 */
async function mixWithEcho(userBlob: Blob, sheikhUrl: string, echoVolume = 0.4): Promise<Blob> {
  const audioContext = new AudioContext();

  // Decode user recording
  const userArrayBuffer = await userBlob.arrayBuffer();
  const userBuffer = await audioContext.decodeAudioData(userArrayBuffer);

  // Fetch & decode sheikh audio
  const sheikhResponse = await fetch(sheikhUrl);
  const sheikhArrayBuffer = await sheikhResponse.arrayBuffer();
  const sheikhBuffer = await audioContext.decodeAudioData(sheikhArrayBuffer);

  // Use the longer duration
  const duration = Math.max(userBuffer.duration, sheikhBuffer.duration);
  const sampleRate = userBuffer.sampleRate;
  const offline = new OfflineAudioContext(1, Math.ceil(duration * sampleRate), sampleRate);

  // User voice at full volume
  const userSource = offline.createBufferSource();
  userSource.buffer = userBuffer;
  userSource.connect(offline.destination);
  userSource.start(0);

  // Sheikh voice at reduced volume
  const sheikhSource = offline.createBufferSource();
  sheikhSource.buffer = sheikhBuffer;
  const gainNode = offline.createGain();
  gainNode.gain.value = echoVolume;
  sheikhSource.connect(gainNode);
  gainNode.connect(offline.destination);
  sheikhSource.start(0);

  // Render
  const renderedBuffer = await offline.startRendering();
  audioContext.close();

  // Encode to WAV blob
  const wavBlob = audioBufferToWav(renderedBuffer);
  return wavBlob;
}

/** Convert an AudioBuffer to a WAV Blob */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataLength = buffer.length * blockAlign;
  const headerLength = 44;
  const arrayBuffer = new ArrayBuffer(headerLength + dataLength);
  const view = new DataView(arrayBuffer);

  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  // Interleave samples
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export const VerseRecorder = ({ surahNumber, verseNumber, verseText, label, reciter = 'alafasy', onRecordingChange }: VerseRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [echoEnabled, setEchoEnabled] = useState(false);
  const [isMixing, setIsMixing] = useState(false);

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

  const getSheikhAudioUrl = useCallback(async (): Promise<string | null> => {
    try {
      const edition = RECITERS[reciter]?.id ?? 'ar.alafasy';
      const res = await fetch(`https://api.alquran.cloud/v1/ayah/${surahNumber}:${verseNumber}/${edition}`);
      const data = await res.json();
      if (data.code === 200 && data.data?.audio) return data.data.audio;
    } catch { /* ignore */ }
    return null;
  }, [reciter, surahNumber, verseNumber]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        const rawBlob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        stream.getTracks().forEach(t => t.stop());
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

        // If echo enabled, mix sheikh audio into the recording
        if (echoEnabled) {
          setIsMixing(true);
          try {
            const sheikhUrl = await getSheikhAudioUrl();
            if (sheikhUrl) {
              const mixed = await mixWithEcho(rawBlob, sheikhUrl, 0.4);
              setRecordedBlob(mixed);
            } else {
              toast.warning("Audio du sheikh indisponible, enregistrement sans écho");
              setRecordedBlob(rawBlob);
            }
          } catch (err) {
            console.error('Mix error:', err);
            toast.warning("Mixage échoué, enregistrement sans écho");
            setRecordedBlob(rawBlob);
          } finally {
            setIsMixing(false);
          }
        } else {
          setRecordedBlob(rawBlob);
        }
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
  }, [echoEnabled, getSheikhAudioUrl, onRecordingChange]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    setIsRecording(false);
    onRecordingChange?.(false);
  }, [onRecordingChange]);

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
      {/* Header row */}
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

        {!isExpanded && !isRecording && !isMixing && (
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

        {isMixing && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Mixage écho en cours…
          </span>
        )}
      </div>

      {/* Expanded controls */}
      {isExpanded && !isRecording && !isMixing && (
        <div className="space-y-2 pt-1">
          {/* Echo toggle - shown before and after recording */}
          <div className="flex items-center gap-2">
            <Switch id={`echo-${surahNumber}-${verseNumber}`} checked={echoEnabled} onCheckedChange={setEchoEnabled} className="scale-75" />
            <Label htmlFor={`echo-${surahNumber}-${verseNumber}`} className="text-[11px] text-muted-foreground cursor-pointer">
              Ajouter la voix du sheikh à l'enregistrement
            </Label>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!activeBlob && (
              <Button variant="outline" size="sm" onClick={() => startRecording()} className="gap-1.5 text-xs">
                <Mic className="h-3.5 w-3.5 text-destructive" />
                Enregistrer
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

                <Button variant="outline" size="sm" onClick={() => startRecording()} className="gap-1 text-xs ml-auto">
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
