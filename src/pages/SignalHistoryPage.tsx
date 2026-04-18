import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2, ArrowRight, Filter, TrendingUp, TrendingDown, Minus,
  AlertTriangle, HelpCircle, ChevronDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Signal = {
  id: string;
  symbol: string | null;
  signal_type: string;
  confidence: string;
  confidence_score: number | null;
  reason: string | null;
  created_at: string;
  risk_tags: string[];
  sources_count: number;
};

type SignalChange = {
  current: Signal;
  previousType: string | null;
};

const SIGNAL_COLORS: Record<string, string> = {
  Bullish: "bg-success/20 text-success border-success/30",
  Bearish: "bg-destructive/20 text-destructive border-destructive/30",
  Neutral: "bg-accent/20 text-accent border-accent/30",
  "High Risk": "bg-[hsl(25,90%,55%)]/20 text-[hsl(25,90%,55%)] border-[hsl(25,90%,55%)]/30",
  "Limited Data": "bg-muted text-muted-foreground border-border",
};

const SIGNAL_ICONS: Record<string, typeof TrendingUp> = {
  Bullish: TrendingUp,
  Bearish: TrendingDown,
  Neutral: Minus,
  "High Risk": AlertTriangle,
  "Limited Data": HelpCircle,
};

const CHANGE_ARROW: Record<string, string> = {
  Bullish: "🔼",
  Bearish: "🔽",
  Neutral: "➡️",
  "High Risk": "⚠️",
  "Limited Data": "❓",
};

const DATE_FILTERS = [
  { label: "All Time", value: "all" },
  { label: "Today", value: "today" },
  { label: "Last 24h", value: "24h" },
  { label: "Last 7 days", value: "7d" },
];

const SIGNAL_TYPES = ["Bullish", "Neutral", "Bearish", "High Risk", "Limited Data"];
const PAGE_SIZE = 100;

const SignalHistoryPage = () => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { toast } = useToast();

  const [dateFilter, setDateFilter] = useState("all");
  const [symbolFilter, setSymbolFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const loadSignals = useCallback(async (offset = 0, append = false) => {
    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);

      const { data, error } = await supabase
        .from("signals")
        .select("id, symbol, signal_type, confidence, confidence_score, reason, created_at, risk_tags, sources_count")
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;
      const mapped = (data || []).map((s: any) => ({
        ...s,
        risk_tags: Array.isArray(s.risk_tags) ? s.risk_tags : [],
      }));

      if (append) {
        setSignals((prev) => [...prev, ...mapped]);
      } else {
        setSignals(mapped);
      }
      setHasMore(mapped.length === PAGE_SIZE);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSignals();
  }, [loadSignals]);

  const uniqueSymbols = useMemo(() => {
    const syms = new Set(signals.map((s) => s.symbol).filter(Boolean) as string[]);
    return Array.from(syms).sort();
  }, [signals]);

  // Detect signal changes per symbol
  const signalChanges = useMemo(() => {
    const bySymbol = new Map<string, Signal[]>();
    for (const s of signals) {
      const key = s.symbol || "UNKNOWN";
      if (!bySymbol.has(key)) bySymbol.set(key, []);
      bySymbol.get(key)!.push(s);
    }

    return signals.map((s): SignalChange => {
      const key = s.symbol || "UNKNOWN";
      const group = bySymbol.get(key)!;
      const idx = group.indexOf(s);
      const prev = idx < group.length - 1 ? group[idx + 1] : null;
      return {
        current: s,
        previousType: prev && prev.signal_type !== s.signal_type ? prev.signal_type : null,
      };
    });
  }, [signals]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return signalChanges.filter(({ current: s }) => {
      if (dateFilter !== "all") {
        const created = new Date(s.created_at).getTime();
        if (dateFilter === "today") {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          if (created < start.getTime()) return false;
        } else if (dateFilter === "24h") {
          if (now - created > 86400000) return false;
        } else if (dateFilter === "7d") {
          if (now - created > 7 * 86400000) return false;
        }
      }
      if (symbolFilter !== "all" && s.symbol !== symbolFilter) return false;
      if (typeFilter !== "all" && s.signal_type !== typeFilter) return false;
      return true;
    });
  }, [signalChanges, dateFilter, symbolFilter, typeFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Signal History</h1>
          <p className="text-xs text-muted-foreground mt-1">Review how crypto signals evolved over time</p>
        </div>
        <span className="text-xs text-muted-foreground font-display">{filtered.length} signals</span>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-card border-border mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={symbolFilter} onValueChange={setSymbolFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs bg-secondary border-border">
              <SelectValue placeholder="All Coins" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Coins</SelectItem>
              {uniqueSymbols.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs bg-secondary border-border">
              <SelectValue placeholder="All Signals" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Signals</SelectItem>
              {SIGNAL_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>No signals found for the selected filters.</p>
        </div>
      ) : (
        <Card className="bg-card border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground font-display text-xs uppercase tracking-wider">Time</TableHead>
                <TableHead className="text-muted-foreground font-display text-xs uppercase tracking-wider">Coin</TableHead>
                <TableHead className="text-muted-foreground font-display text-xs uppercase tracking-wider">Signal</TableHead>
                <TableHead className="text-muted-foreground font-display text-xs uppercase tracking-wider">Confidence</TableHead>
                <TableHead className="text-muted-foreground font-display text-xs uppercase tracking-wider">Reason</TableHead>
                <TableHead className="text-muted-foreground font-display text-xs uppercase tracking-wider">Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(({ current: s, previousType }) => {
                const Icon = SIGNAL_ICONS[s.signal_type] || Minus;
                const colorClass = SIGNAL_COLORS[s.signal_type] || SIGNAL_COLORS["Limited Data"];
                const arrow = CHANGE_ARROW[s.signal_type] || "→";
                return (
                  <TableRow key={s.id} className="border-border">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-display">
                      {format(new Date(s.created_at), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-display font-semibold text-foreground">
                        {s.symbol || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${colorClass} border text-xs gap-1`}>
                        <Icon className="w-3 h-3" />
                        {s.signal_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${Math.min(s.confidence_score ?? 50, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground font-display min-w-[24px]">
                          {s.confidence_score ?? "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[280px]">
                      <p className="text-xs text-muted-foreground truncate" title={s.reason || ""}>
                        {s.reason || "—"}
                      </p>
                    </TableCell>
                    <TableCell>
                      {previousType ? (
                        <div className="flex items-center gap-1.5 text-xs font-display whitespace-nowrap">
                          <span>{arrow}</span>
                          <span className="text-muted-foreground">changed from</span>
                          <Badge variant="outline" className={`${SIGNAL_COLORS[previousType] || ""} border text-[10px] px-1.5 py-0`}>
                            {previousType}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Load More */}
      {hasMore && filtered.length > 0 && (
        <div className="flex justify-center mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadSignals(signals.length, true)}
            disabled={loadingMore}
            className="text-xs font-display gap-1"
          >
            {loadingMore ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronDown className="w-3 h-3" />}
            Load More
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center mt-6">
        Educational only. Not financial advice.
      </p>
    </div>
  );
};

export default SignalHistoryPage;
