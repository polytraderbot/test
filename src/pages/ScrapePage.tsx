import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Search, CheckCircle, AlertCircle, Zap, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Status = "idle" | "scraping" | "done" | "error";

const SUPABASE_URL = "https://rvgujmdjjdyqhahlpeao.supabase.co/functions/v1";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Z3VqbWRqamR5cWhhaGxwZWFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDMxMzYsImV4cCI6MjA4ODMxOTEzNn0.VqmHFUFhdVeECK7p_2d-IqfJMnRCwmtwsZdnKoWSda8";

const ScrapePage = () => {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [assetCount, setAssetCount] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  const isValidUrl = (input: string): boolean => {
    try {
      const u = new URL(input.startsWith("http") ? input : `https://${input}`);
      return !!u.hostname.includes(".");
    } catch {
      return false;
    }
  };

  const handleMultiSourceScan = async () => {
    try {
      setStatus("scraping");
      setStatusMsg("Running multi-source scan: CoinGecko markets + trending + technical indicators...");

      const response = await fetch(`${SUPABASE_URL}/multi-source-crawl`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (!data?.success) {
        throw new Error(data?.error || "Multi-source scan failed");
      }

      setAssetCount(data.asset_count);
      setStatusMsg(`Found ${data.asset_count} assets. Generating AI signals...`);

      // Auto-generate story with signals
      try {
        await fetch(`${SUPABASE_URL}/generate-story`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ scrape_id: data.scrape_id }),
        });
        setStatus("done");
        setStatusMsg(`Done! ${data.asset_count} assets with AI signals & ${data.technical_count} technical analyses.`);
      } catch {
        setStatus("done");
        setStatusMsg(`Done! ${data.asset_count} assets. Story generation can be triggered on dashboard.`);
      }

      toast({
        title: "Multi-source scan complete",
        description: `${data.asset_count} assets with AI signals. Redirecting...`,
      });

      setTimeout(() => navigate(`/dashboard?scrape_id=${data.scrape_id}`), 1500);
    } catch (err: any) {
      console.error("Multi-source error:", err);
      setStatus("error");
      setStatusMsg(err.message || "Something went wrong");
      toast({ title: "Scan failed", description: err.message, variant: "destructive" });
    }
  };

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();

    if (!trimmed) {
      setStatus("error");
      setStatusMsg("Please enter a URL to scrape.");
      return;
    }

    if (!isValidUrl(trimmed)) {
      setStatus("error");
      setStatusMsg("That doesn't look like a valid URL.");
      toast({ title: "Invalid URL", description: "Please enter a valid webpage URL.", variant: "destructive" });
      return;
    }

    try {
      setStatus("scraping");
      setStatusMsg("Scraping page, extracting assets, and saving to database...");

      const response = await fetch(`${SUPABASE_URL}/scrape-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ url: trimmed }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (!data?.success) {
        throw new Error(data?.error || "Scrape failed");
      }

      if (data.asset_count === 0) {
        setStatus("error");
        setStatusMsg("No crypto assets found on that page.");
        toast({ title: "No assets found", description: "Try a different URL.", variant: "destructive" });
        return;
      }

      setAssetCount(data.asset_count);
      setStatus("done");
      setStatusMsg(`Done! Found ${data.asset_count} assets.`);

      toast({
        title: "Scrape complete",
        description: `Extracted ${data.asset_count} crypto assets.`,
      });

      setTimeout(() => navigate(`/dashboard?scrape_id=${data.scrape_id}`), 1500);
    } catch (err: any) {
      console.error("Scrape error:", err);
      setStatus("error");
      setStatusMsg(err.message || "Something went wrong");
      toast({ title: "Scrape failed", description: err.message, variant: "destructive" });
    }
  };

  const statusIcon = {
    idle: null,
    scraping: <Loader2 className="w-5 h-5 animate-spin text-primary" />,
    done: <CheckCircle className="w-5 h-5 text-success" />,
    error: <AlertCircle className="w-5 h-5 text-destructive" />,
  };

  const isLoading = status === "scraping";

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          Crypto Signal <span className="text-primary glow-text">Engine</span>
        </h1>
        <p className="text-muted-foreground">
          Multi-source data collection with technical indicators
        </p>
      </div>

      {/* Multi-Source Scan — Primary Action */}
      <Card className="p-6 glow-cyan bg-card border-border mb-6">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Globe className="w-4 h-4 text-primary" />
            <span>CoinGecko Markets + Trending + RSI/MACD/Bollinger</span>
          </div>
          <Button
            onClick={handleMultiSourceScan}
            disabled={isLoading}
            size="lg"
            className="gap-2 w-full text-base"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
            Multi-Source Scan
          </Button>
          <p className="text-xs text-muted-foreground">
            Fetches top 30 coins, trending assets, and calculates technical indicators for the top 10.
            Takes ~20 seconds.
          </p>
        </div>
      </Card>

      {/* Single URL Scrape — Secondary */}
      <Card className="p-6 bg-card border-border">
        <p className="text-xs font-display text-muted-foreground uppercase tracking-wider mb-3">Or scrape a specific page</p>
        <form onSubmit={handleScrape} className="flex gap-2">
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.coingecko.com/en/categories/..."
            className="bg-muted border-border text-foreground placeholder:text-muted-foreground font-body"
            disabled={isLoading}
            required
          />
          <Button type="submit" disabled={isLoading} variant="outline" className="shrink-0 gap-2">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Scrape
          </Button>
        </form>
      </Card>

      {/* Status */}
      {status !== "idle" && (
        <div className="mt-6 flex items-center gap-3 p-4 rounded-md bg-muted/50 border border-border">
          {statusIcon[status]}
          <div>
            <p className="text-sm font-medium text-foreground">{statusMsg}</p>
            {status === "done" && (
              <p className="text-xs text-muted-foreground mt-1">
                {assetCount} assets saved · Redirecting to dashboard...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScrapePage;
