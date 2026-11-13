/** Retained endpoint for older APKs: never generate paid speech. */
export function disabledTafsirSpeechResponse(req: Request, corsHeaders: Record<string, string>): Response {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  return new Response(JSON.stringify({ error: 'Cloud Tafsir speech is disabled. Use device speech.', code: 'DEVICE_SPEECH_ONLY' }), {
    status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}