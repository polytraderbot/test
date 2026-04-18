import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabase } from "../_shared/supabase.ts";

// Official Supabase CORS helper (recommended - includes all needed headers)
import { corsHeaders } from '@supabase/supabase-js/cors';

serve(async (req) => {
  // MUST BE FIRST: Handle browser preflight OPTIONS (no body parsing here!)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Safe: Only parse body for non-OPTIONS
    const body = await req.json().catch(() => ({})); // empty object if no body

    // ────────────────────────────────────────────────────────────────
    // PASTE YOUR ORIGINAL FUNCTION LOGIC HERE
    // Example placeholder (replace with your real crawl/scan code):
    // const { someParam } = body;
    // const result = await supabase.from('some_table').select('*');
    // ... your CoinGecko + trending + indicators scan ...
    const result = { success: true, message: "Multi-source scan completed" };
    // ────────────────────────────────────────────────────────────────

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Multi-source-crawl error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Scan failed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
