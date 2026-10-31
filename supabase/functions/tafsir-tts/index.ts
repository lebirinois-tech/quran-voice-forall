import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { paidAiUser } from '../_shared/paidAiAuth.ts';

const MODEL = "google/gemini-3.1-flash-tts-preview";
const VOICE = "Charon"; // male, calm and informative
const STYLE: Record<string, string> = {
  ar: "اقرأ النص الآتي بالعربية الفصحى بصوت رجل هادئ ووقور، مع نطق التشكيل ومخارج الحروف وقواعد الإعراب بدقة، والوقوف عند علامات الترقيم: ",
  fr: "Lis le texte suivant en français, d'une voix d'homme calme et posée : ",
  en: "Read the following text in English with a calm, measured male voice: ",
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    const auth = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
    const userId = await paidAiUser(req, async (token) => {
      const { data, error } = await auth.auth.getClaims(token);
      return error ? null : data?.claims ?? null;
    });
    if (!userId) return json({ error: 'Sign in required' }, 401);
    const { text, lang } = await req.json();
    if (typeof text !== "string" || !text.trim() || text.length > 1500) return json({ error: "Invalid text" }, 400);
    if (!["ar", "fr", "en"].includes(lang)) return json({ error: "Invalid lang" }, 400);
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "Service unavailable" }, 500);

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        contents: [{ role: "user", parts: [{ text: STYLE[lang] + text.trim() }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
        },
        stream_format: "sse",
      }),
    });
    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error("tts error", upstream.status, detail);
      let message = "Speech generation failed";
      try { message = JSON.parse(detail)?.error?.message ?? JSON.parse(detail)?.message ?? message; } catch { /* keep */ }
      return json({ error: message }, upstream.status);
    }
    return new Response(upstream.body, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (e) {
    console.error(e);
    return json({ error: "Bad request" }, 400);
  }
});
