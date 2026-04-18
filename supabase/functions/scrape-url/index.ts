import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createScrape, insertAssets } from "../_shared/supabase.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Firecrawl not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping URL:', formattedUrl);

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl error:', response.status, data);
      return new Response(JSON.stringify({ error: data.error || 'Scrape failed' }), {
        status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const markdown = data.data?.markdown || data.markdown || '';

    // Extract assets via AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Extracting assets via AI...');
    const truncatedMarkdown = markdown.slice(0, 15000);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: 'You are a crypto data extraction assistant. Extract cryptocurrency assets from scraped webpage content.' },
          { role: 'user', content: `Extract all cryptocurrency assets from this scraped CoinGecko page content. For each asset, extract the name, symbol (ticker), price (as number, null if not found), 24h change percentage (as number, null if not found), and market cap (as number, null if not found).\n\nContent:\n${truncatedMarkdown}` },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_assets',
            description: 'Return extracted crypto assets from webpage content',
            parameters: {
              type: 'object',
              properties: {
                assets: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      symbol: { type: 'string' },
                      price: { type: 'number', nullable: true },
                      change_24h: { type: 'number', nullable: true },
                      market_cap: { type: 'number', nullable: true },
                    },
                    required: ['name', 'symbol'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['assets'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'extract_assets' } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (status === 402) return new Response(JSON.stringify({ error: 'AI credits exhausted' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      throw new Error('AI extraction failed');
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error('AI did not return structured data');

    const parsed = JSON.parse(toolCall.function.arguments);
    const extractedAssets = (parsed.assets || []).map((a: any) => ({
      ...a,
      source_url: formattedUrl,
    }));

    // Save to DB using shared helpers
    console.log(`Saving scrape + ${extractedAssets.length} assets...`);
    const scrapeRow = await createScrape(formattedUrl);
    const savedAssets = await insertAssets(scrapeRow.id, extractedAssets);

    return new Response(JSON.stringify({
      success: true,
      scrape_id: scrapeRow.id,
      asset_count: savedAssets.length,
      url: formattedUrl,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Scrape pipeline error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
