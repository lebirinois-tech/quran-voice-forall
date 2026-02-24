import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioBase64, mimeType, verseText, surahNumber, verseNumber } = await req.json();

    if (!audioBase64 || !verseText) {
      return new Response(JSON.stringify({ error: "Missing audio or verse text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

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
                type: "image_url",
                image_url: {
                  url: `data:${mimeType || "audio/webm"};base64,${audioBase64}`,
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
      throw new Error(`AI Gateway error: ${response.status}`);
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
