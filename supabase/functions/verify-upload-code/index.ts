import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ valid: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ valid: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const code = typeof body?.code === "string" ? body.code : "";
    if (!code || code.length > 200) {
      return new Response(
        JSON.stringify({ valid: false, error: "Code invalide" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validCode = Deno.env.get("UPLOAD_ACCESS_CODE");

    if (!validCode) {
      return new Response(
        JSON.stringify({ valid: false, error: "Code non configuré" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Constant-time-ish comparison
    let isValid = code.length === validCode.length;
    for (let i = 0; i < Math.max(code.length, validCode.length); i++) {
      if (code.charCodeAt(i) !== validCode.charCodeAt(i)) isValid = false;
    }

    // Small artificial delay to slow brute-force attempts
    await new Promise((r) => setTimeout(r, 400));

    if (isValid) {
      // Grant the user upload privileges via service-role client
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { error: insertErr } = await adminClient
        .from("allowed_uploaders")
        .upsert({ user_id: userId }, { onConflict: "user_id" });
      if (insertErr) {
        console.error("Failed to grant uploader role:", insertErr);
        return new Response(
          JSON.stringify({ valid: false, error: "Erreur serveur" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ valid: isValid }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ valid: false, error: "Requête invalide" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
