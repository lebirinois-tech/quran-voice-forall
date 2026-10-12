import type { TafsirSpeechLang } from './tafsirSpeech';

const DB = 'tafsir-tts-cache';
const STORE = 'clips';
const SAMPLE_RATE = 24000;
let dbp: Promise<IDBDatabase | null> | null = null;
const openDb = () => dbp ??= new Promise(resolve => {
  if (typeof indexedDB === 'undefined') return resolve(null);
  const r = indexedDB.open(DB, 2);
  r.onupgradeneeded = () => {
    if (r.result.objectStoreNames.contains(STORE)) r.result.deleteObjectStore(STORE);
    r.result.createObjectStore(STORE);
  };
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => resolve(null);
});
const getClip = async (k: string) => {
  const db = await openDb(); if (!db) return null;
  return new Promise<Float32Array | null>(res => {
    const q = db.transaction(STORE).objectStore(STORE).get(k);
    q.onsuccess = () => res(q.result instanceof Float32Array ? q.result : null);
    q.onerror = () => res(null);
  });
};
const putClip = async (k: string, s: Float32Array) => {
  const db = await openDb(); if (!db) return;
  db.transaction(STORE, 'readwrite').objectStore(STORE).put(s, k);
};

async function hash(s: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** First chunk short so sound starts fast; later chunks longer for natural intonation. */
export function splitCloudChunks(text: string, first = 280, max = 800): string[] {
  const parts = text.replace(/\s+/g, ' ').trim().match(/[^.!?؟؛،。]+[.!?؟؛،。]*/gu) ?? [];
  const out: string[] = []; let buf = '';
  for (const p of parts) {
    const s = p.trim();
    const limit = out.length === 0 ? first : max;
    if (buf && buf.length + s.length + 1 > limit) { out.push(buf); buf = ''; }
    if (s.length > max) { for (let i = 0; i < s.length; i += max) out.push(s.slice(i, i + max)); continue; }
    buf = buf ? `${buf} ${s}` : s;
  }
  if (buf) out.push(buf);
  return out;
}

export class CloudSpeechError extends Error { constructor(msg: string, public status: number) { super(msg); } }

function base64ToBytes(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Plays queued PCM chunks gaplessly on one AudioContext (created inside the user's tap). */
export class PcmPlayer {
  ctx: AudioContext;
  private playhead = 0;
  private sources = new Set<AudioBufferSourceNode>();
  constructor() {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx({ sampleRate: SAMPLE_RATE });
    this.ctx.resume().catch(() => {});
  }
  push(samples: Float32Array) {
    if (!samples.length) return;
    const buf = this.ctx.createBuffer(1, samples.length, SAMPLE_RATE);
    buf.getChannelData(0).set(samples);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.ctx.destination);
    this.playhead = Math.max(this.playhead, this.ctx.currentTime + 0.08);
    src.start(this.playhead);
    this.playhead += buf.duration;
    this.sources.add(src);
    src.onended = () => this.sources.delete(src);
  }
  /** Resolves when everything queued has finished playing. */
  drained(signal: AbortSignal) {
    return new Promise<void>(resolve => {
      const check = () => {
        if (signal.aborted || this.ctx.currentTime >= this.playhead) return resolve();
        setTimeout(check, 150);
      };
      check();
    });
  }
  close() {
    this.sources.forEach(s => { try { s.stop(); } catch { /* already stopped */ } });
    this.sources.clear();
    this.ctx.close().catch(() => {});
  }
}

/** Streams one chunk into the player (or replays it from the device cache). */
export async function playCloudChunk(text: string, lang: TafsirSpeechLang, player: PcmPlayer, signal: AbortSignal, onFirstAudio: () => void) {
  const key = await hash(`v2:${lang}:${text}`);
  const cached = await getClip(key);
  if (cached) { onFirstAudio(); player.push(cached); return; }

  const res = await fetch(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/tafsir-tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ text, lang }),
    signal,
  });
  if (!res.ok || !res.body) {
    let msg = `HTTP ${res.status}`;
    try { msg = (await res.json()).error ?? msg; } catch { /* keep */ }
    throw new CloudSpeechError(msg, res.status);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let sse = '';
  let pending = new Uint8Array(0);
  let done = false;
  let started = false;
  const all: Float32Array[] = [];
  const handle = (data: string) => {
    const payload = JSON.parse(data) as { type?: string; audio?: string; error?: { message?: string } };
    if (payload.type === 'error' || payload.error) throw new CloudSpeechError(payload.error?.message ?? 'speech error', 502);
    if (payload.type === 'speech.audio.done') { done = true; return; }
    if (payload.type !== 'speech.audio.delta' || !payload.audio) return;
    const incoming = base64ToBytes(payload.audio);
    const bytes = new Uint8Array(pending.length + incoming.length);
    bytes.set(pending); bytes.set(incoming, pending.length);
    const usable = bytes.length - (bytes.length % 2);
    const view = new DataView(bytes.buffer);
    const samples = new Float32Array(usable / 2);
    for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true) / 32768;
    pending = bytes.slice(usable);
    if (!started) { started = true; onFirstAudio(); }
    player.push(samples);
    all.push(samples);
  };
  for (;;) {
    const { value, done: end } = await reader.read();
    if (value) sse += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = sse.search(/\r?\n\r?\n/)) >= 0) {
      const block = sse.slice(0, idx);
      sse = sse.slice(idx).replace(/^\r?\n\r?\n/, '');
      const data = block.split(/\r?\n/).filter(l => l.startsWith('data:')).map(l => l.slice(5).trim()).join('\n');
      if (data && data !== '[DONE]') handle(data);
    }
    if (end) break;
  }
  if (!done) throw new CloudSpeechError('incomplete audio', 502);
  const total = all.reduce((n, a) => n + a.length, 0);
  const merged = new Float32Array(total);
  let o = 0; for (const a of all) { merged.set(a, o); o += a.length; }
  putClip(key, merged);
}
