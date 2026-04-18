import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabase, getAssetsByScrape } from "../_shared/supabase.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

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

    const allAssets = await getAssetsByScrape(scrape_id);
    const assets = allAssets.slice(0, 30);

    if (assets.length === 0) {
      return new Response(JSON.stringify({ error: 'No assets found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch Reddit sentiment data
    let redditSummary = '';
    try {
      const { data: redditPosts } = await supabase
        .from('reddit_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (redditPosts && redditPosts.length > 0) {
        const symbolStats: Record<string, { mentions: number; positive: number; negative: number; neutral: number; totalEngagement: number }> = {};
        for (const post of redditPosts) {
          const symbols = (post.symbols as string[]) || [];
          for (const sym of symbols) {
            if (!symbolStats[sym]) symbolStats[sym] = { mentions: 0, positive: 0, negative: 0, neutral: 0, totalEngagement: 0 };
            symbolStats[sym].mentions++;
            symbolStats[sym][(post.sentiment_label || 'neutral') as 'positive' | 'negative' | 'neutral']++;
            symbolStats[sym].totalEngagement += post.engagement_score || 0;
          }
        }

        const totalPos = redditPosts.filter(p => p.sentiment_label === 'positive').length;
        const totalNeg = redditPosts.filter(p => p.sentiment_label === 'negative').length;
        const totalNeu = redditPosts.filter(p => p.sentiment_label === 'neutral').length;

        const topMentioned = Object.entries(symbolStats)
          .sort((a, b) => b[1].mentions - a[1].mentions)
          .slice(0, 10);

        redditSummary = `\n\nREDDIT SENTIMENT DATA (${redditPosts.length} recent posts):\n`;
        redditSummary += `Overall: ${totalPos} positive, ${totalNeg} negative, ${totalNeu} neutral\n`;
        redditSummary += `Top discussed:\n`;
        for (const [sym, stats] of topMentioned) {
          redditSummary += `  ${sym}: ${stats.mentions} mentions (${stats.positive}+ ${stats.negative}- ${stats.neutral}~) engagement: ${stats.totalEngagement}\n`;
        }
      }
    } catch (e) {
      console.warn('Could not fetch Reddit data:', e);
    }

    // Build asset summary with technical indicators
    const assetSummary = assets.map((a: any) => {
      let line = `${a.name} (${a.symbol})`;
      if (a.price != null) line += ` Price: $${a.price}`;
      if (a.change_24h != null) line += ` 24h: ${a.change_24h > 0 ? '+' : ''}${a.change_24h}%`;
      if (a.market_cap != null) line += ` MCap: $${(a.market_cap / 1e9).toFixed(2)}B`;
      if (a.volume_24h != null) line += ` Vol: $${(a.volume_24h / 1e6).toFixed(0)}M`;
      if (a.sources_count > 1) line += ` Sources: ${a.sources_count}`;

      // Technical data
      const tech = a.technical_data;
      if (tech) {
        if (tech.rsi != null) line += ` RSI: ${tech.rsi}`;
        if (tech.macd) line += ` MACD: ${tech.macd.histogram > 0 ? 'bullish' : 'bearish'}(${tech.macd.histogram})`;
        if (tech.bollinger) line += ` BB%B: ${tech.bollinger.percentB}`;
        if (tech.volume_spike != null && tech.volume_spike > 1.5) line += ` VolSpike: ${tech.volume_spike}x`;
      }
      return line;
    }).join('\n');

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
            content: `You are a crypto market analyst for beginners. You have price data, technical indicators (RSI, MACD, Bollinger Bands, volume spikes), AND Reddit community sentiment data.

Rules:
- Use technical indicators to improve signal accuracy when available.
- RSI > 70 = overbought (potential sell), RSI < 30 = oversold (potential buy).
- MACD positive histogram = bullish momentum, negative = bearish.
- Bollinger %B > 1 = above upper band (overbought), < 0 = below lower band (oversold).
- Volume spike > 1.5x = unusual activity.
- Use Reddit sentiment as a SUPPLEMENTARY signal, never as the sole basis for a signal.
- When Reddit mentions are high and sentiment aligns with technicals, increase confidence.
- When Reddit sentiment conflicts with technicals, add risk tag "Conflicting social sentiment".
- Write a retail_sentiment_summary describing what Reddit communities are reacting to.
- Keep reasons beginner-friendly, 1 sentence max.
- If data is missing, mention "limited data" in reasoning.
- Never guarantee profits.
- For each signal, assign confidence_score (0-100) based on data quality + indicator agreement + sentiment alignment.
- Assign risk_tags from: "High volatility", "Low liquidity", "Limited data", "Conflicting signals", "Conflicting social sentiment", "High social hype".
- Write beginner_explanation a non-technical person can understand.
- Provide 2-3 evidence snippets per signal (include Reddit as a source when relevant).`,
          },
          {
            role: 'user',
            content: `Analyze these ${assets.length} crypto assets with their technical indicators and Reddit sentiment. Generate a market story AND per-asset signals:\n\n${assetSummary}${redditSummary}`,
          },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_market_story',
            description: 'Generate structured crypto market analysis with technical indicator-enriched signals',
            parameters: {
              type: 'object',
              properties: {
                trend_summary: { type: 'array', items: { type: 'string' }, description: '3 bullet points' },
                hot_segments: { type: 'array', items: { type: 'string' }, description: '2 hot sectors' },
                opportunities: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: { name: { type: 'string' }, symbol: { type: 'string' }, reason: { type: 'string' } },
                    required: ['name', 'symbol', 'reason'], additionalProperties: false,
                  },
                },
                high_risk: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: { name: { type: 'string' }, symbol: { type: 'string' }, reason: { type: 'string' } },
                    required: ['name', 'symbol', 'reason'], additionalProperties: false,
                  },
                },
                retail_sentiment_summary: { type: 'string', description: 'Summary of what Reddit crypto communities are reacting to' },
                beginner_explanation: { type: 'string' },
                disclaimer: { type: 'string' },
                signals: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      symbol: { type: 'string' },
                      signal: { type: 'string', enum: ['buy', 'sell', 'hold'] },
                      reason: { type: 'string' },
                      confidence_score: { type: 'integer' },
                      risk_tags: { type: 'array', items: { type: 'string' } },
                      beginner_explanation: { type: 'string' },
                      evidence: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: { source_name: { type: 'string' }, snippet: { type: 'string' } },
                          required: ['source_name', 'snippet'], additionalProperties: false,
                        },
                      },
                    },
                    required: ['symbol', 'signal', 'reason', 'confidence_score', 'risk_tags', 'beginner_explanation', 'evidence'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['trend_summary', 'hot_segments', 'opportunities', 'high_risk', 'retail_sentiment_summary', 'beginner_explanation', 'disclaimer', 'signals'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'generate_market_story' } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (response.status === 402) return new Response(JSON.stringify({ error: 'AI credits exhausted' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      throw new Error('Story generation failed');
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error('AI did not return structured story');

    const story = JSON.parse(toolCall.function.arguments);

    // Upsert story
    const { data: existing } = await supabase
      .from("stories").select("id").eq("scrape_id", scrape_id).maybeSingle();
    if (existing) {
      await supabase.from("stories").update({ story_json: story }).eq("id", existing.id);
    } else {
      await supabase.from("stories").insert({ scrape_id, story_json: story });
    }

    // Save signals to DB
    if (story.signals && Array.isArray(story.signals)) {
      const assetIdMap = new Map<string, string>();
      assets.forEach((a: any) => assetIdMap.set(a.symbol.toUpperCase(), a.id));

      const assetIds = assets.map((a: any) => a.id);
      if (assetIds.length > 0) {
        const { data: oldSignals } = await supabase.from("signals").select("id").in("asset_id", assetIds);
        if (oldSignals?.length) {
          await supabase.from("signal_evidence").delete().in("signal_id", oldSignals.map((s: any) => s.id));
          await supabase.from("signals").delete().in("asset_id", assetIds);
        }
      }

      for (const sig of story.signals) {
        const assetId = assetIdMap.get(sig.symbol.toUpperCase());
        if (!assetId) continue;
        const signalType = sig.signal === 'buy' ? 'Bullish' : sig.signal === 'sell' ? 'Bearish' : 'Neutral';
        const confidence = sig.confidence_score >= 70 ? 'High' : sig.confidence_score >= 40 ? 'Med' : 'Low';

        const { data: signalRow } = await supabase.from("signals").insert({
          crawl_id: scrape_id,
          asset_id: assetId,
          signal_type: signalType,
          confidence,
          confidence_score: sig.confidence_score,
          reason: sig.reason,
          risk_tags: sig.risk_tags || [],
          beginner_explanation: sig.beginner_explanation,
          sources_count: sig.evidence?.length || 0,
        }).select("id").single();

        if (signalRow && sig.evidence?.length) {
          await supabase.from("signal_evidence").insert(
            sig.evidence.map((e: any) => ({ signal_id: signalRow.id, source_name: e.source_name, snippet: e.snippet }))
          );
        }
      }
    }

    return new Response(JSON.stringify(story), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Story error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
