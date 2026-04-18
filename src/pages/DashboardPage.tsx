import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Loader2, Sparkles, TrendingUp, TrendingDown, AlertTriangle, BookOpen,
  ShieldAlert, Globe, Clock, BarChart3, Flame, Shield, Activity, Star, RefreshCw,
  MessageCircle, ThumbsUp, ThumbsDown, Minus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AssetsTable, { type AISignal } from "@/components/AssetsTable";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

type Asset = {
  id: string;
  name: string;
  symbol: string;
  price: number | null;
  change_24h: number | null;
  market_cap: number | null;
  source_url: string | null;
  volume_24h?: number | null;
  sources_count?: number;
  technical_data?: any;
};

type Scrape = { id: string; url: string; created_at: string };

type MarketStory = {
  trend_summary: string[];
  hot_segments: string[];
  opportunities: { name: string; symbol: string; reason: string }[];
  high_risk: { name: string; symbol: string; reason: string }[];
  retail_sentiment_summary?: string;
  beginner_explanation: string;
  disclaimer: string;
  signals?: AISignal[];
};

type RedditStats = {
  total_posts: number;
  sentiment_overview: { positive: number; negative: number; neutral: number };
  top_mentioned: { symbol: string; mentions: number; dominant_sentiment: string; totalEngagement: number }[];
};

const DashboardPage = () => {
  const [searchParams] = useSearchParams();
  const paramScrapeId = searchParams.get("scrape_id");
  const [activeScrapeId, setActiveScrapeId] = useState<string | null>(paramScrapeId);
  const [scrape, setScrape] = useState<Scrape | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [story, setStory] = useState<MarketStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [storyLoading, setStoryLoading] = useState(false);
  const [beginnerMode, setBeginnerMode] = useState(true);
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [redditStats, setRedditStats] = useState<RedditStats | null>(null);
  const [redditLoading, setRedditLoading] = useState(false);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadDataRef = useRef<(silent?: boolean) => Promise<void>>(null!);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    loadWatchlist();
  }, [paramScrapeId]);


  // Auto-refresh
  useEffect(() => {
    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(() => { loadDataRef.current(true); }, 30000);
    }
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
  }, [autoRefresh]);

  const loadWatchlist = async () => {
    try {
      const { data } = await supabase.from("watchlist").select("asset_id");
      if (data) setWatchlist(new Set(data.map((w: any) => w.asset_id)));
    } catch {}
  };

  const toggleWatchlist = async (assetId: string) => {
    const isWatched = watchlist.has(assetId);
    try {
      if (isWatched) {
        await supabase.from("watchlist").delete().eq("asset_id", assetId);
        setWatchlist(prev => { const n = new Set(prev); n.delete(assetId); return n; });
      } else {
        await supabase.from("watchlist").insert({ asset_id: assetId });
        setWatchlist(prev => new Set(prev).add(assetId));
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    if (silent) setIsRefreshing(true);
    try {
      let resolvedId = paramScrapeId;
      if (!resolvedId) {
        const { data: latest } = await supabase
          .from("scrapes").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (!latest) { setLoading(false); setIsRefreshing(false); return; }
        resolvedId = latest.id;
        setScrape(latest);
      } else {
        const { data: scrapeRow } = await supabase
          .from("scrapes").select("*").eq("id", resolvedId).maybeSingle();
        setScrape(scrapeRow);
      }
      setActiveScrapeId(resolvedId);

      const { data } = await supabase
        .from("assets").select("*").eq("scrape_id", resolvedId!).order("created_at", { ascending: true });
      setAssets(data || []);

      const { data: storyData } = await supabase
        .from("stories").select("story_json").eq("scrape_id", resolvedId!).maybeSingle();
      setStory(storyData?.story_json ? storyData.story_json as unknown as MarketStory : null);
      if (silent) setLastRefreshedAt(new Date());
    } catch (err: any) {
      toast({ title: "Error loading data", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };
  loadDataRef.current = loadData;

  const generateStory = async () => {
    if (!activeScrapeId || assets.length === 0) return;
    setStoryLoading(true);
    try {
      // First fetch Reddit sentiment (fire and forget into DB)
      setRedditLoading(true);
      try {
        const { data: redditData, error: redditErr } = await supabase.functions.invoke("reddit-sentiment", {
          body: { scrape_id: activeScrapeId },
        });
        if (!redditErr && redditData?.success) {
          setRedditStats(redditData as RedditStats);
        }
      } catch (e) {
        console.warn('Reddit sentiment fetch failed, continuing:', e);
      } finally {
        setRedditLoading(false);
      }

      // Then generate story (which now reads Reddit data from DB)
      const { data, error } = await supabase.functions.invoke("generate-story", {
        body: { scrape_id: activeScrapeId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setStory(data as MarketStory);
      toast({ title: "Market Story generated!", description: "AI analysis with technical indicators & Reddit sentiment is ready." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setStoryLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">No assets yet. Go to the <a href="/scrape" className="text-primary underline">Scrape page</a> to get started.</p>
      </div>
    );
  }

  const sentimentCounts = { buy: 0, sell: 0, hold: 0 };
  const avgConfidence = story?.signals?.length
    ? Math.round(story.signals.reduce((sum, s) => sum + (s.confidence_score || 50), 0) / story.signals.length)
    : null;
  story?.signals?.forEach(s => { sentimentCounts[s.signal]++; });
  const dominantSentiment = sentimentCounts.buy >= sentimentCounts.sell
    ? (sentimentCounts.buy > sentimentCounts.hold ? "Bullish" : "Neutral")
    : "Bearish";
  const totalSources = story?.signals?.reduce((sum, s) => sum + (s.evidence?.length || 0), 0) || 0;

  // Count assets with technical data
  const techCount = assets.filter(a => a.technical_data).length;
  const isMultiSource = scrape?.url?.startsWith("multi-source:");

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {scrape && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4 text-primary" />
              <span>Last updated: <span className="text-foreground font-medium">{formatDistanceToNow(new Date(scrape.created_at), { addSuffix: true })}</span></span>
            </div>
          )}
          {isMultiSource && (
            <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-display border border-primary/30">
              Multi-Source
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            <Label htmlFor="auto-refresh" className="text-xs font-display text-muted-foreground cursor-pointer">
              Auto-refresh
            </Label>
            {autoRefresh && isRefreshing && (
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
            )}
            {autoRefresh && !isRefreshing && lastRefreshedAt && (
              <span className="text-[10px] text-muted-foreground/60">
                refreshed {formatDistanceToNow(lastRefreshedAt, { addSuffix: true })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Switch id="beginner-mode" checked={beginnerMode} onCheckedChange={setBeginnerMode} />
            <Label htmlFor="beginner-mode" className="text-xs font-display text-muted-foreground cursor-pointer">
              Beginner Mode
            </Label>
          </div>
          <Button
            variant={showWatchlistOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowWatchlistOnly(!showWatchlistOnly)}
            className="gap-1 text-xs"
          >
            <Star className="w-3 h-3" />
            Watchlist {watchlist.size > 0 && `(${watchlist.size})`}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {story && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard icon={<Activity className="w-5 h-5" />} label="Market Sentiment" value={dominantSentiment}
            valueClass={dominantSentiment === "Bullish" ? "text-success" : dominantSentiment === "Bearish" ? "text-destructive" : "text-accent"} />
          <SummaryCard icon={<Flame className="w-5 h-5" />} label="Hot Sector" value={story.hot_segments?.[0] || "—"} valueClass="text-accent" />
          <SummaryCard icon={<Shield className="w-5 h-5" />} label="Avg Confidence" value={avgConfidence !== null ? `${avgConfidence}%` : "—"}
            valueClass={avgConfidence !== null ? (avgConfidence >= 70 ? "text-success" : avgConfidence >= 40 ? "text-accent" : "text-destructive") : "text-muted-foreground"} />
          <SummaryCard icon={<BarChart3 className="w-5 h-5" />} label="Tech Indicators" value={techCount > 0 ? `${techCount} assets` : "—"} valueClass="text-primary" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Crypto Signals Dashboard</h1>
          <p className="text-sm text-muted-foreground">{assets.length} assets · {techCount} with technical analysis</p>
        </div>
        <Button onClick={generateStory} disabled={storyLoading} className="gap-2" variant={story ? "outline" : "default"}>
          {storyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : story ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          {story ? "Regenerate" : "Generate AI Story"}
        </Button>
      </div>

      {/* Source info */}
      {scrape && (
        <Card className="p-3 bg-card border-border">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
              <Globe className="w-4 h-4 shrink-0 text-primary" />
              <span className="font-display text-foreground/70 truncate max-w-[400px]">
                {isMultiSource ? "CoinGecko Markets + Trending + Technical Indicators" : scrape.url}
              </span>
            </div>
            <span className="text-xs font-display text-muted-foreground/60">{assets.length} assets</span>
          </div>
        </Card>
      )}

      {/* Assets Table */}
      <AssetsTable
        assets={assets}
        aiSignals={story?.signals}
        beginnerMode={beginnerMode}
        watchlist={watchlist}
        onToggleWatchlist={toggleWatchlist}
        showWatchlistOnly={showWatchlistOnly}
      />

      {storyLoading && (
        <Card className="p-8 bg-card border-border text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {redditLoading ? "Fetching Reddit sentiment..." : "AI is analyzing with technical indicators & Reddit sentiment..."}
          </p>
        </Card>
      )}

      {/* Reddit Sentiment Card */}
      {redditStats && (
        <RedditSentimentCard stats={redditStats} />
      )}

      {story && <MarketStoryPanel story={story} beginnerMode={beginnerMode} />}

      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
          <ShieldAlert className="w-3 h-3" />
          Educational only. Not financial advice.
        </p>
      </div>
    </div>
  );
};

const SummaryCard = ({ icon, label, value, valueClass }: { icon: React.ReactNode; label: string; value: string; valueClass: string }) => (
  <Card className="p-4 bg-card border-border">
    <div className="flex items-center gap-2 mb-2 text-muted-foreground">{icon}<span className="text-xs font-display uppercase tracking-wider">{label}</span></div>
    <p className={`text-lg font-display font-bold ${valueClass}`}>{value}</p>
  </Card>
);

const MarketStoryPanel = ({ story, beginnerMode }: { story: MarketStory; beginnerMode: boolean }) => (
  <Card className="p-6 bg-card border-border glow-cyan space-y-6">
    <div className="flex items-center gap-2">
      <Sparkles className="w-5 h-5 text-accent" />
      <h2 className="text-xl font-display font-bold text-foreground">AI Market Story</h2>
    </div>

    <section>
      <h3 className="flex items-center gap-1.5 text-sm font-display font-semibold text-primary mb-2"><TrendingUp className="w-4 h-4" /> Market Trends</h3>
      <ul className="space-y-1.5">
        {story.trend_summary.map((t, i) => (
          <li key={i} className="text-sm text-foreground/80 flex gap-2"><span className="text-primary mt-0.5">•</span>{t}</li>
        ))}
      </ul>
    </section>

    <section>
      <h3 className="flex items-center gap-1.5 text-sm font-display font-semibold text-accent mb-2">🔥 Hot Segments</h3>
      <div className="flex flex-wrap gap-2">
        {story.hot_segments.map((s, i) => (
          <span key={i} className="px-3 py-1.5 rounded-full bg-accent/15 border border-accent/30 text-sm font-semibold text-accent">{s}</span>
        ))}
      </div>
    </section>

    <section>
      <h3 className="flex items-center gap-1.5 text-sm font-display font-semibold text-success mb-2"><TrendingUp className="w-4 h-4" /> Top Opportunities</h3>
      <div className="space-y-2">
        {story.opportunities.map((o, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span className="font-display font-semibold text-success shrink-0">{o.name} <span className="text-success/60">({o.symbol})</span></span>
            <span className="text-foreground/70">— {o.reason}</span>
          </div>
        ))}
      </div>
    </section>

    <section>
      <h3 className="flex items-center gap-1.5 text-sm font-display font-semibold text-destructive mb-2"><AlertTriangle className="w-4 h-4" /> High Risk</h3>
      <div className="space-y-2">
        {story.high_risk.map((r, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span className="font-display font-semibold text-destructive shrink-0">{r.name} <span className="text-destructive/60">({r.symbol})</span></span>
            <span className="text-foreground/70">— {r.reason}</span>
          </div>
        ))}
      </div>
    </section>

    {story.retail_sentiment_summary && (
      <section>
        <h3 className="flex items-center gap-1.5 text-sm font-display font-semibold text-foreground mb-2">
          <MessageCircle className="w-4 h-4 text-primary" /> Reddit Retail Sentiment
          <Badge variant="secondary" className="ml-1 text-[10px]">Reddit</Badge>
        </h3>
        <p className="text-sm text-foreground/70 leading-relaxed">{story.retail_sentiment_summary}</p>
      </section>
    )}

    {beginnerMode && story.beginner_explanation && (
      <section>
        <h3 className="flex items-center gap-1.5 text-sm font-display font-semibold text-foreground mb-2"><BookOpen className="w-4 h-4" /> For Beginners</h3>
        <p className="text-sm text-foreground/70 leading-relaxed">{story.beginner_explanation}</p>
      </section>
    )}

    <section className="pt-4 border-t border-border">
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
        <p>{story.disclaimer}</p>
      </div>
    </section>
  </Card>
);

const RedditSentimentCard = ({ stats }: { stats: RedditStats }) => {
  const { sentiment_overview, top_mentioned, total_posts } = stats;
  const total = sentiment_overview.positive + sentiment_overview.negative + sentiment_overview.neutral;
  const posPercent = total > 0 ? Math.round((sentiment_overview.positive / total) * 100) : 0;
  const negPercent = total > 0 ? Math.round((sentiment_overview.negative / total) * 100) : 0;

  return (
    <Card className="p-5 bg-card border-border">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-display font-bold text-foreground">Reddit Sentiment</h3>
        <Badge variant="outline" className="text-[10px]">{total_posts} posts</Badge>
      </div>

      {/* Sentiment bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-1 text-xs text-success">
          <ThumbsUp className="w-3 h-3" /> {sentiment_overview.positive} ({posPercent}%)
        </div>
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden flex">
          <div className="bg-success h-full" style={{ width: `${posPercent}%` }} />
          <div className="bg-muted-foreground/30 h-full" style={{ width: `${100 - posPercent - negPercent}%` }} />
          <div className="bg-destructive h-full" style={{ width: `${negPercent}%` }} />
        </div>
        <div className="flex items-center gap-1 text-xs text-destructive">
          <ThumbsDown className="w-3 h-3" /> {sentiment_overview.negative} ({negPercent}%)
        </div>
      </div>

      {/* Top mentioned */}
      {top_mentioned.length > 0 && (
        <div>
          <p className="text-xs font-display text-muted-foreground uppercase tracking-wider mb-2">Top Discussed</p>
          <div className="flex flex-wrap gap-2">
            {top_mentioned.slice(0, 8).map((item) => (
              <div key={item.symbol} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border text-xs">
                <span className="font-display font-semibold text-foreground">{item.symbol}</span>
                <span className="text-muted-foreground">{item.mentions}×</span>
                <span className={
                  item.dominant_sentiment === 'positive' ? 'text-success' :
                  item.dominant_sentiment === 'negative' ? 'text-destructive' : 'text-muted-foreground'
                }>
                  {item.dominant_sentiment === 'positive' ? '↑' : item.dominant_sentiment === 'negative' ? '↓' : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default DashboardPage;
