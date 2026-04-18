import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAssetsByScrape } from "../_shared/supabase.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scrape_id } = await req.json();
    if (!scrape_id) {
      return new Response(JSON.stringify({ error: 'scrape_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 1: Load top 30 assets
    const allAssets = await getAssetsByScrape(scrape_id);
    const assets = allAssets.slice(0, 30);

    if (assets.length === 0) {
      return new Response(JSON.stringify({ error: 'No assets found for this scrape_id' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const assetSummary = assets.map((a: any) => {
      let line = `${a.name} (${a.symbol})`;
      if (a.price != null) line += ` Price: $${a.price}`;
      else line += ` Price: unknown`;
      if (a.change_24h != null) line += ` 24h: ${a.change_24h > 0 ? '+' : ''}${a.change_24h}%`;
      else line += ` 24h: unknown`;
      if (a.market_cap != null) line += ` MCap: $${(a.market_cap / 1e9).toFixed(2)}B`;
      else line += ` MCap: unknown`;
      return line;
    }).join('\n');

    // Step 2: Call AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `You are a crypto insight assistant for beginners. Rules:
- Reasons must be short (1 sentence), beginner-friendly, and non-technical.
- If price or change data is missing, base reasoning on qualitative signals and say "limited data".
- Never guarantee profits or suggest certainty.`,
          },
          {
            role: 'user',
            content: `From these crypto assets, pick exactly 3 that look like they could go UP and 3 that look like they could go DOWN. Provide a short reason for each.\n\n${assetSummary}`,
          },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'return_insight',
            description: 'Return UP and DOWN picks with reasons and a disclaimer',
            parameters: {
              type: 'object',
              properties: {
                up: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Full coin name' },
                      symbol: { type: 'string', description: 'Ticker symbol' },
                      reason: { type: 'string', description: 'Short beginner-friendly reason' },
                    },
                    required: ['name', 'symbol', 'reason'],
                    additionalProperties: false,
                  },
                  description: 'Exactly 3 coins likely to go up',
                },
                down: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Full coin name' },
                      symbol: { type: 'string', description: 'Ticker symbol' },
                      reason: { type: 'string', description: 'Short beginner-friendly reason' },
                    },
                    required: ['name', 'symbol', 'reason'],
                    additionalProperties: false,
                  },
                  description: 'Exactly 3 coins likely to go down',
                },
                disclaimer: {
                  type: 'string',
                  description: 'One sentence disclaimer about not being financial advice',
                },
              },
              required: ['up', 'down', 'disclaimer'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'return_insight' } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (response.status === 402) return new Response(JSON.stringify({ error: 'AI credits exhausted, please add funds' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const errText = await response.text();
      console.error('AI error:', response.status, errText);
      throw new Error('Insight generation failed');
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error('AI did not return structured insight');

    const insight = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(insight), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Insight error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
