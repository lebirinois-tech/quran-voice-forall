import { corsHeaders as sdkCorsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { disabledTafsirSpeechResponse } from './handler.ts';

const corsHeaders = {
  ...sdkCorsHeaders,
  'Access-Control-Allow-Headers': `${sdkCorsHeaders['Access-Control-Allow-Headers']}, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version`,
};

Deno.serve(req => disabledTafsirSpeechResponse(req, corsHeaders));
