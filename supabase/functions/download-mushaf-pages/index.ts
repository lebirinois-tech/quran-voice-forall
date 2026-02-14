import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// EasyQuran Tajweed Mushaf source
const getMushafPageUrl = (page: number): string => {
  return `https://easyquran.com/wp-content/uploads/2022/09/${page}-scaled.jpg`;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user's token
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { page, action } = body;

    // Validate action against whitelist
    const VALID_ACTIONS = ['check-status', 'download-page', 'download-batch'];
    if (!action || !VALID_ACTIONS.includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be one of: check-status, download-page, download-batch' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for storage operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check which pages are already downloaded
    if (action === "check-status") {
      const { data: files, error } = await supabase.storage
        .from("mushaf-pages")
        .list("", { limit: 1000 });

      if (error) {
        throw error;
      }

      const downloadedPages = (files || [])
        .map(f => parseInt(f.name.replace(".jpg", "")))
        .filter(n => !isNaN(n));

      return new Response(
        JSON.stringify({ 
          downloadedPages,
          total: 604,
          remaining: 604 - downloadedPages.length 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download a specific page
    if (action === "download-page" && page) {
      const pageNum = parseInt(page);
      if (pageNum < 1 || pageNum > 604) {
        throw new Error("Invalid page number");
      }

      // Check if already exists
      const { data: existing } = await supabase.storage
        .from("mushaf-pages")
        .list("", { search: `${pageNum}.jpg` });

      if (existing && existing.length > 0) {
        const { data: urlData } = supabase.storage
          .from("mushaf-pages")
          .getPublicUrl(`${pageNum}.jpg`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            page: pageNum, 
            url: urlData.publicUrl,
            cached: true 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Download from EasyQuran
      const sourceUrl = getMushafPageUrl(pageNum);
      const response = await fetch(sourceUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch page ${pageNum} from source`);
      }

      const imageBlob = await response.blob();
      const arrayBuffer = await imageBlob.arrayBuffer();

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("mushaf-pages")
        .upload(`${pageNum}.jpg`, arrayBuffer, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from("mushaf-pages")
        .getPublicUrl(`${pageNum}.jpg`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          page: pageNum, 
          url: urlData.publicUrl,
          cached: false 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download a batch of pages
    if (action === "download-batch") {
      const start = parseInt(body.startPage) || 1;
      const end = Math.min(parseInt(body.endPage) || start + 9, 604);
      
      const results = [];
      for (let p = start; p <= end; p++) {
        try {
          const sourceUrl = getMushafPageUrl(p);
          const response = await fetch(sourceUrl);
          
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            
            await supabase.storage
              .from("mushaf-pages")
              .upload(`${p}.jpg`, arrayBuffer, {
                contentType: "image/jpeg",
                upsert: true,
              });
            
            results.push({ page: p, success: true });
          } else {
            results.push({ page: p, success: false });
          }
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : 'Unknown error';
          results.push({ page: p, success: false, error: errorMessage });
        }
      }

      return new Response(
        JSON.stringify({ results, completed: results.filter(r => r.success).length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
