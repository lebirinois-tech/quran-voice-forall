import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Require authenticated caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { surah, verse, lang, themes } = await req.json();
    if (
      typeof surah !== "number" || surah < 1 || surah > 114 ||
      typeof verse !== "number" || verse < 1 || verse > 286 ||
      !["ar", "fr", "en"].includes(lang) ||
      !Array.isArray(themes) || themes.length === 0 || themes.length > 6
    ) {
      return new Response(JSON.stringify({ error: "Invalid parameters" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const safeThemes = (themes as unknown[])
      .filter((t) => typeof t === "string" && t.length < 80)
      .slice(0, 6) as string[];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const langName = lang === "ar" ? "Arabic (Modern Standard, classical religious tone)" : lang === "fr" ? "French" : "English";
    const langCode = lang === "ar" ? "ar" : lang === "fr" ? "fr" : "en";
    const systemPrompt = `You are a respectful Islamic scholar specialized in thematic Tafsir (Tafsir Mawdou'i).
CRITICAL LANGUAGE REQUIREMENT: You MUST write the ENTIRE response in ${langName} (ISO code: ${langCode}). Do NOT mix languages. Do NOT respond in Arabic unless ${langCode} === "ar".
Given a Quranic verse reference and its associated themes, write a clear, concise thematic explanation in ${langName} (3–5 sentences, 60–120 words).
- Explain how this specific verse relates to the listed themes.
- Stay faithful to mainstream Sunni scholarship (no sectarian polemic).
- Do NOT quote the Arabic text of the verse.
- Output ONLY the explanation, no preamble, no markdown, no headings.
- Final reminder: respond strictly in ${langName}.`;

    const userPrompt = `Verse: Surah ${surah}, Ayah ${verse}\nThemes: ${safeThemes.join(", ")}\n\nWrite the thematic explanation. Required output language: ${langName} ONLY.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte. Réessayez plus tard." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("thematic-tafsir error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
