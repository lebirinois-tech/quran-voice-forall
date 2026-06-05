import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-upload-code",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const expected = Deno.env.get("UPLOAD_ACCESS_CODE");
    const provided = req.headers.get("x-upload-code");
    if (!expected || provided !== expected) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json() as { files: Array<{ name: string; b64: string }> };
    if (!body?.files || !Array.isArray(body.files)) {
      return new Response(JSON.stringify({ error: "Invalid body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const results: Array<{ name: string; ok: boolean; error?: string }> = [];
    for (const f of body.files) {
      try {
        const bin = Uint8Array.from(atob(f.b64), (c) => c.charCodeAt(0));
        const { error } = await supabase.storage
          .from("mushaf-pages")
          .upload(`qalun-tajweed/${f.name}`, bin, {
            contentType: "image/jpeg",
            upsert: true,
          });
        if (error) throw error;
        results.push({ name: f.name, ok: true });
      } catch (e) {
        results.push({ name: f.name, ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return new Response(JSON.stringify({ results, count: results.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});