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
    // Cap batch size to prevent abuse
    if (body.files.length > 700) {
      return new Response(JSON.stringify({ error: "Too many files (max 700)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Strict allowlist for file names: digits + .jpg/.jpeg/.png only, no path segments.
    const SAFE_NAME = /^[A-Za-z0-9_-]{1,64}\.(jpg|jpeg|png)$/;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const results: Array<{ name: string; ok: boolean; error?: string }> = [];
    for (const f of body.files) {
      try {
        if (!f || typeof f.name !== "string" || typeof f.b64 !== "string") {
          results.push({ name: String(f?.name ?? ""), ok: false, error: "Invalid entry" });
          continue;
        }
        if (!SAFE_NAME.test(f.name) || f.name.includes("/") || f.name.includes("..") || f.name.includes("\\")) {
          results.push({ name: f.name, ok: false, error: "Invalid file name" });
          continue;
        }
        // Cap individual payload at ~5MB base64
        if (f.b64.length > 7_000_000) {
          results.push({ name: f.name, ok: false, error: "File too large" });
          continue;
        }
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