import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth is optional — app is offline-first, no account required to use AI analysis.
    const { audioBase64, mimeType, verseText, surahNumber, verseNumber } = await req.json();

    if (!audioBase64 || !verseText) {
      return new Response(JSON.stringify({ error: "Missing audio or verse text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Cap audio payload at ~10MB base64 (~7.5MB raw) to prevent abuse
    if (typeof audioBase64 !== "string" || audioBase64.length > 10_000_000) {
      return new Response(JSON.stringify({ error: "Audio payload too large (max ~7.5MB)" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    // Normalize audio format for OpenAI-compatible input_audio
    const rawMime = (mimeType || "audio/webm").toLowerCase();
    let audioFormat = "webm";
    if (rawMime.includes("wav")) audioFormat = "wav";
    else if (rawMime.includes("mpeg") || rawMime.includes("mp3")) audioFormat = "mp3";
    else if (rawMime.includes("ogg")) audioFormat = "ogg";
    else if (rawMime.includes("mp4") || rawMime.includes("m4a") || rawMime.includes("aac")) audioFormat = "mp4";
    else if (rawMime.includes("webm")) audioFormat = "webm";

    // Use Gemini with audio input for transcription + comparison
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Tu es un expert en récitation coranique et tajweed. L'utilisateur t'envoie un enregistrement audio de sa récitation d'un verset du Coran. Tu dois:
1. Transcrire ce que tu entends en arabe
2. Comparer avec le texte original du verset
3. Évaluer la qualité de la récitation (prononciation, tajweed, fluidité)

Réponds UNIQUEMENT en JSON valide avec ce format exact:
{
  "score": <number 0-100>,
  "feedback": "<résumé court en français de la qualité, 1-2 phrases>",
  "details": "<détails spécifiques sur les erreurs ou points à améliorer, en français>"
}

Le score doit refléter: exactitude du texte (50%), prononciation/tajweed (30%), fluidité (20%).
Si l'audio est inaudible ou ne contient pas de récitation, donne un score de 0 avec un feedback approprié.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Voici le verset original (Sourate ${surahNumber}, Verset ${verseNumber}):\n${verseText}\n\nÉvalue ma récitation audio ci-jointe.`,
              },
              {
                type: "input_audio",
                input_audio: {
                  data: audioBase64,
                  format: audioFormat,
                },
              },
            ],
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI Gateway error:", errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte. Réessayez dans quelques instants." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés. Ajoutez du crédit dans Lovable Cloud." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `AI Gateway error ${response.status}`, details: errText.slice(0, 300) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response (handle markdown code blocks)
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      result = { score: 0, feedback: "Impossible d'analyser la récitation. Réessayez avec un enregistrement plus clair.", details: content };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
