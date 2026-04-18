import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabase } from "../_shared/supabase.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const KNOWN_SYMBOLS: Record<string, string> = {
  BTC: 'Bitcoin', ETH: 'Ethereum', SOL: 'Solana', BNB: 'BNB', XRP: 'XRP',
  ADA: 'Cardano', DOGE: 'Dogecoin', DOT: 'Polkadot', AVAX: 'Avalanche', MATIC: 'Polygon',
  LINK: 'Chainlink', UNI: 'Uniswap', SHIB: 'Shiba Inu', LTC: 'Litecoin', ATOM: 'Cosmos',
  FIL: 'Filecoin', APT: 'Aptos', ARB: 'Arbitrum', OP: 'Optimism', SUI: 'Sui',
  NEAR: 'NEAR', FTM: 'Fantom', ALGO: 'Algorand', ICP: 'Internet Computer', RENDER: 'Render',
  INJ: 'Injective', TIA: 'Celestia', SEI: 'Sei', PEPE: 'Pepe', WIF: 'dogwifhat',
  BONK: 'Bonk', FLOKI: 'Floki', IMX: 'Immutable X', AAVE: 'Aave', MKR: 'Maker',
  CRV: 'Curve', SNX: 'Synthetix', COMP: 'Compound', LDO: 'Lido', RPL: 'Rocket Pool',
  FET: 'Fetch.ai', RNDR: 'Render', TAO: 'Bittensor', WLD: 'Worldcoin', GRT: 'The Graph',
  HBAR: 'Hedera', XMR: 'Monero', BCH: 'Bitcoin Cash', TRX: 'TRON', PI: 'Pi Network',
};

const NAME_TO_SYMBOL: Record<string, string> = {};
for (const [sym, name] of Object.entries(KNOWN_SYMBOLS)) {
  NAME_TO_SYMBOL[name.toLowerCase()] = sym;
}

function detectSymbols(text: string): string[] {
  const found = new Set<string>();
  const upper = text.toUpperCase();
  const lower = text.toLowerCase();
  const dollarMatches = text.matchAll(/\$([A-Z]{2,6})/g);
  for (const m of dollarMatches) { if (KNOWN_SYMBOLS[m[1]]) found.add(m[1]); }
  for (const sym of Object.keys(KNOWN_SYMBOLS)) {
    if (sym.length >= 3 && new RegExp(`\\b${sym}\\b`).test(upper)) found.add(sym);
  }
  for (const [name, sym] of Object.entries(NAME_TO_SYMBOL)) {
    if (lower.includes(name)) found.add(sym);
  }
  return Array.from(found);
}

function classifySentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const lower = text.toLowerCase();
  const posWords = ['bullish', 'moon', 'pump', 'surge', 'rally', 'breakout', 'ath', 'soaring', 'gains', 'buy', 'adoption', 'partnership', 'upgrade', 'approved', 'launch', 'exciting', 'amazing', 'record', 'profit', 'growth', 'rising', 'green', 'opportunity'];
  const negWords = ['bearish', 'crash', 'dump', 'scam', 'rug', 'hack', 'exploit', 'plunge', 'sell', 'warning', 'fraud', 'lawsuit', 'sec', 'ban', 'fear', 'panic', 'collapse', 'bubble', 'drop', 'lost', 'down', 'red', 'decline', 'failed'];
  let pos = 0, neg = 0;
  for (const w of posWords) if (lower.includes(w)) pos++;
  for (const w of negWords) if (lower.includes(w)) neg++;
  if (pos > neg) return 'positive';
  if (neg > pos) return 'negative';
  return 'neutral';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const scrapeId = body.scrape_id;

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: 'Firecrawl not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Fetching Reddit sentiment via Firecrawl search...');

    // Use Firecrawl SEARCH to find recent Reddit crypto discussions
    const searchQueries = [
      'site:reddit.com crypto market today',
      'site:reddit.com cryptocurrency bullish bearish',
      'site:reddit.com bitcoin ethereum solana price',
    ];

    const allPosts: any[] = [];

    for (let i = 0; i < searchQueries.length; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 1500));

      try {
        console.log(`Searching: "${searchQueries[i]}"`);
        const res = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: searchQueries[i],
            limit: 15,
            tbs: 'qdr:d', // last 24 hours
          }),
        });

        if (!res.ok) {
          console.warn(`Firecrawl search returned ${res.status}`);
          continue;
        }

        const data = await res.json();
        const results = data?.data || [];
        console.log(`Search returned ${results.length} results`);

        for (const result of results) {
          const url = result.url || '';
          // Only keep reddit.com results
          if (!url.includes('reddit.com')) continue;

          // Extract subreddit from URL
          const subMatch = url.match(/reddit\.com\/r\/([^\/]+)/);
          const subreddit = subMatch ? subMatch[1] : 'unknown';

          const title = result.title || '';
          const description = result.description || '';

          allPosts.push({
            subreddit,
            title: title.slice(0, 500),
            url,
            snippet: description.slice(0, 300) || null,
          });
        }
      } catch (e) {
        console.warn('Search error:', e);
      }
    }

    console.log(`Total Reddit posts collected: ${allPosts.length}`);

    // Deduplicate by URL
    const seen = new Set<string>();
    const uniquePosts = allPosts.filter(p => {
      if (!p.url || seen.has(p.url)) return false;
      seen.add(p.url);
      return true;
    });

    // Enrich
    const enrichedPosts = uniquePosts.map(post => {
      const text = `${post.title} ${post.snippet || ''}`;
      return {
        subreddit: post.subreddit,
        title: post.title,
        url: post.url,
        snippet: post.snippet,
        symbols: detectSymbols(text),
        sentiment_label: classifySentiment(text),
        engagement_score: 0,
        scrape_id: scrapeId || null,
        reddit_created_at: null,
      };
    });

    // Store
    if (enrichedPosts.length > 0) {
      const { error: insertErr } = await supabase.from('reddit_posts').insert(enrichedPosts);
      if (insertErr) console.error('Insert error:', insertErr.message);
      else console.log(`Stored ${enrichedPosts.length} Reddit posts`);
    }

    // Aggregate
    const symbolStats: Record<string, { mentions: number; positive: number; negative: number; neutral: number; totalEngagement: number }> = {};
    for (const post of enrichedPosts) {
      for (const sym of post.symbols) {
        if (!symbolStats[sym]) symbolStats[sym] = { mentions: 0, positive: 0, negative: 0, neutral: 0, totalEngagement: 0 };
        symbolStats[sym].mentions++;
        symbolStats[sym][post.sentiment_label as 'positive' | 'negative' | 'neutral']++;
      }
    }

    const totalPos = enrichedPosts.filter(p => p.sentiment_label === 'positive').length;
    const totalNeg = enrichedPosts.filter(p => p.sentiment_label === 'negative').length;
    const totalNeu = enrichedPosts.filter(p => p.sentiment_label === 'neutral').length;

    const topMentioned = Object.entries(symbolStats)
      .sort((a, b) => b[1].mentions - a[1].mentions)
      .slice(0, 10)
      .map(([symbol, stats]) => ({
        symbol, ...stats,
        dominant_sentiment: stats.positive > stats.negative ? 'positive' : stats.negative > stats.positive ? 'negative' : 'neutral',
      }));

    return new Response(JSON.stringify({
      success: true,
      total_posts: enrichedPosts.length,
      subreddits_scraped: new Set(enrichedPosts.map(p => p.subreddit)).size,
      sentiment_overview: { positive: totalPos, negative: totalNeg, neutral: totalNeu },
      top_mentioned: topMentioned,
      symbol_stats: symbolStats,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Reddit sentiment error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
