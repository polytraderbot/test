import { useState } from "react";
import {
  TrendingUp, TrendingDown, Minus, ArrowUpCircle, ArrowDownCircle, CircleDot,
  ChevronDown, ChevronUp, Star, StarOff, ExternalLink, Shield, AlertTriangle,
  Info, Activity
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

type Signal = "buy" | "sell" | "hold";

type EvidenceItem = { source_name: string; snippet: string; page_url?: string };

type AISignal = {
  symbol: string;
  signal: Signal;
  reason: string;
  confidence_score?: number;
  risk_tags?: string[];
  beginner_explanation?: string;
  evidence?: EvidenceItem[];
};

const getRuleBasedSignal = (change: number | null): Signal => {
  if (change == null) return "hold";
  if (change >= 3) return "buy";
  if (change <= -3) return "sell";
  return "hold";
};

const formatPrice = (price: number | null) => {
  if (price == null) return "—";
  if (price < 0.01) return `$${price.toFixed(6)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatMarketCap = (cap: number | null) => {
  if (cap == null) return "—";
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
  return `$${cap.toLocaleString()}`;
};

const getConfidenceLabel = (score: number) => {
  if (score >= 70) return { label: "High", className: "text-success" };
  if (score >= 40) return { label: "Medium", className: "text-accent" };
  return { label: "Low", className: "text-destructive" };
};

const getConfidenceBarColor = (score: number) => {
  if (score >= 70) return "bg-success";
  if (score >= 40) return "bg-accent";
  return "bg-destructive";
};

const riskTagColors: Record<string, string> = {
  "High volatility": "bg-destructive/15 text-destructive border-destructive/30",
  "Low liquidity": "bg-accent/15 text-accent border-accent/30",
  "Limited data": "bg-muted text-muted-foreground border-border",
  "Conflicting signals": "bg-primary/15 text-primary border-primary/30",
};

const SignalBadge = ({ signal, isAI }: { signal: Signal; isAI: boolean }) => {
  const config = {
    buy: { icon: ArrowUpCircle, label: "BUY", className: "bg-success/15 text-success border-success/30" },
    sell: { icon: ArrowDownCircle, label: "SELL", className: "bg-destructive/15 text-destructive border-destructive/30" },
    hold: { icon: CircleDot, label: "HOLD", className: "bg-accent/15 text-accent border-accent/30" },
  };
  const { icon: Icon, label, className } = config[signal];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-display font-semibold border ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
      {isAI && <span className="text-[10px] opacity-70">AI</span>}
    </span>
  );
};

const BeginnerTooltip = ({ term, explanation }: { term: string; explanation: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="inline-flex items-center gap-0.5 cursor-help border-b border-dotted border-muted-foreground/40">
        {term}
        <Info className="w-3 h-3 text-muted-foreground" />
      </span>
    </TooltipTrigger>
    <TooltipContent className="max-w-[200px] text-xs">{explanation}</TooltipContent>
  </Tooltip>
);

const TechIndicatorBadge = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-display font-medium border ${color}`}>
    {label}: {value}
  </span>
);

type AssetsTableProps = {
  assets: Asset[];
  aiSignals?: AISignal[];
  beginnerMode?: boolean;
  watchlist?: Set<string>;
  onToggleWatchlist?: (assetId: string) => void;
  showWatchlistOnly?: boolean;
};

const AssetsTable = ({ assets, aiSignals, beginnerMode = false, watchlist, onToggleWatchlist, showWatchlistOnly = false }: AssetsTableProps) => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const signalMap = new Map<string, AISignal>();
  aiSignals?.forEach((s) => signalMap.set(s.symbol.toUpperCase(), s));

  const filteredAssets = showWatchlistOnly && watchlist
    ? assets.filter(a => watchlist.has(a.id))
    : assets;

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            {onToggleWatchlist && <th className="w-10 px-2 py-3"></th>}
            <th className="text-left px-4 py-3 font-display text-xs font-semibold text-muted-foreground uppercase tracking-wider">Asset</th>
            <th className="text-center px-4 py-3 font-display text-xs font-semibold text-muted-foreground uppercase tracking-wider">Signal</th>
            <th className="text-center px-3 py-3 font-display text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {beginnerMode ? <BeginnerTooltip term="Confidence" explanation="How sure the AI is about this signal. Higher = more data supports it." /> : "Confidence"}
            </th>
            <th className="text-center px-3 py-3 font-display text-xs font-semibold text-muted-foreground uppercase tracking-wider">Risk</th>
            <th className="text-right px-4 py-3 font-display text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price</th>
            {!beginnerMode && (
              <>
                <th className="text-right px-4 py-3 font-display text-xs font-semibold text-muted-foreground uppercase tracking-wider">24h</th>
                <th className="text-right px-4 py-3 font-display text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <BeginnerTooltip term="Mkt Cap" explanation="Total value of all coins in circulation." />
                </th>
              </>
            )}
            <th className="text-center px-3 py-3 font-display text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {beginnerMode ? <BeginnerTooltip term="Tech" explanation="Technical indicators like RSI and MACD from price history analysis." /> : "Tech"}
            </th>
            <th className="w-10 px-2 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {filteredAssets.map((asset) => {
            const aiSignal = signalMap.get(asset.symbol.toUpperCase());
            const signal = aiSignal?.signal || getRuleBasedSignal(asset.change_24h);
            const isAI = !!aiSignal;
            const isExpanded = expandedRow === asset.id;
            const confidence = aiSignal?.confidence_score ?? null;
            const isWatched = watchlist?.has(asset.id);
            const tech = asset.technical_data;

            return (
              <>
                <tr
                  key={asset.id}
                  className={`border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer ${isExpanded ? 'bg-muted/20' : ''}`}
                  onClick={() => setExpandedRow(isExpanded ? null : asset.id)}
                >
                  {onToggleWatchlist && (
                    <td className="px-2 py-3 text-center">
                      <button onClick={(e) => { e.stopPropagation(); onToggleWatchlist(asset.id); }} className="hover:scale-110 transition-transform">
                        {isWatched ? <Star className="w-4 h-4 text-accent fill-accent" /> : <StarOff className="w-4 h-4 text-muted-foreground hover:text-accent" />}
                      </button>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{asset.name}</p>
                    <p className="text-xs font-display text-muted-foreground">{asset.symbol}</p>
                  </td>
                  <td className="px-4 py-3 text-center"><SignalBadge signal={signal} isAI={isAI} /></td>
                  <td className="px-3 py-3">
                    {confidence !== null ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-xs font-display font-semibold ${getConfidenceLabel(confidence).className}`}>
                          {getConfidenceLabel(confidence).label}
                        </span>
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${getConfidenceBarColor(confidence)}`} style={{ width: `${confidence}%` }} />
                        </div>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex flex-wrap justify-center gap-1">
                      {aiSignal?.risk_tags?.length ? aiSignal.risk_tags.map((tag, i) => (
                        <span key={i} className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${riskTagColors[tag] || 'bg-muted text-muted-foreground border-border'}`}>{tag}</span>
                      )) : <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-display text-foreground">{formatPrice(asset.price)}</td>
                  {!beginnerMode && (
                    <>
                      <td className="px-4 py-3 text-right"><ChangeCell value={asset.change_24h} /></td>
                      <td className="px-4 py-3 text-right font-display text-foreground/70">{formatMarketCap(asset.market_cap)}</td>
                    </>
                  )}
                  <td className="px-3 py-3 text-center">
                    {tech ? (
                      <div className="flex flex-col items-center gap-0.5">
                        {tech.rsi != null && (
                          <span className={`text-[10px] font-display font-semibold ${tech.rsi > 70 ? 'text-destructive' : tech.rsi < 30 ? 'text-success' : 'text-muted-foreground'}`}>
                            RSI {Math.round(tech.rsi)}
                          </span>
                        )}
                        {tech.macd && (
                          <span className={`text-[10px] font-display ${tech.macd.histogram > 0 ? 'text-success' : 'text-destructive'}`}>
                            {tech.macd.histogram > 0 ? '▲' : '▼'} MACD
                          </span>
                        )}
                      </div>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-2 py-3 text-center">
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </td>
                </tr>

                {isExpanded && (
                  <tr key={`${asset.id}-expanded`} className="bg-muted/10">
                    <td colSpan={beginnerMode ? 8 : 10} className="px-6 py-4 border-b border-border/50">
                      <div className="space-y-4 max-w-3xl">
                        {/* Technical Indicators Detail */}
                        {tech && (
                          <div>
                            <h4 className="text-xs font-display font-semibold text-primary mb-2 uppercase tracking-wider flex items-center gap-1">
                              <Activity className="w-3 h-3" /> Technical Indicators
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {tech.rsi != null && (
                                <TechIndicatorBadge
                                  label="RSI(14)"
                                  value={String(Math.round(tech.rsi))}
                                  color={tech.rsi > 70 ? 'bg-destructive/15 text-destructive border-destructive/30' : tech.rsi < 30 ? 'bg-success/15 text-success border-success/30' : 'bg-muted text-muted-foreground border-border'}
                                />
                              )}
                              {tech.macd && (
                                <TechIndicatorBadge
                                  label="MACD"
                                  value={tech.macd.histogram > 0 ? `Bullish (${tech.macd.histogram})` : `Bearish (${tech.macd.histogram})`}
                                  color={tech.macd.histogram > 0 ? 'bg-success/15 text-success border-success/30' : 'bg-destructive/15 text-destructive border-destructive/30'}
                                />
                              )}
                              {tech.bollinger && (
                                <TechIndicatorBadge
                                  label="BB %B"
                                  value={String(tech.bollinger.percentB)}
                                  color={tech.bollinger.percentB > 1 ? 'bg-destructive/15 text-destructive border-destructive/30' : tech.bollinger.percentB < 0 ? 'bg-success/15 text-success border-success/30' : 'bg-muted text-muted-foreground border-border'}
                                />
                              )}
                              {tech.volume_spike != null && tech.volume_spike > 1.2 && (
                                <TechIndicatorBadge
                                  label="Volume"
                                  value={`${tech.volume_spike}x avg`}
                                  color="bg-accent/15 text-accent border-accent/30"
                                />
                              )}
                            </div>
                            {beginnerMode && (
                              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                {tech.rsi != null && tech.rsi > 70 ? "RSI suggests this coin may be overbought — price could pull back. " : ""}
                                {tech.rsi != null && tech.rsi < 30 ? "RSI suggests this coin may be oversold — could be a buying opportunity. " : ""}
                                {tech.macd?.histogram > 0 ? "MACD shows bullish momentum. " : ""}
                                {tech.macd?.histogram < 0 ? "MACD shows bearish momentum. " : ""}
                                {tech.volume_spike != null && tech.volume_spike > 1.5 ? `Trading volume is ${tech.volume_spike}x above average — unusual activity. ` : ""}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Signal Reason */}
                        {aiSignal?.reason && (
                          <div>
                            <h4 className="text-xs font-display font-semibold text-primary mb-1 uppercase tracking-wider">Signal Reason</h4>
                            <p className="text-sm text-foreground/80">{aiSignal.reason}</p>
                          </div>
                        )}

                        {/* Beginner Explanation */}
                        {aiSignal?.beginner_explanation && (
                          <div className="p-3 rounded-md bg-primary/5 border border-primary/20">
                            <h4 className="text-xs font-display font-semibold text-primary mb-1 flex items-center gap-1">
                              <Info className="w-3 h-3" /> Beginner Explanation
                            </h4>
                            <p className="text-sm text-foreground/70 leading-relaxed">{aiSignal.beginner_explanation}</p>
                          </div>
                        )}

                        {/* Evidence */}
                        {aiSignal?.evidence && aiSignal.evidence.length > 0 && (
                          <div>
                            <h4 className="text-xs font-display font-semibold text-accent mb-2 flex items-center gap-1 uppercase tracking-wider">
                              <Shield className="w-3 h-3" /> Evidence Sources ({aiSignal.evidence.length})
                            </h4>
                            <div className="space-y-2">
                              {aiSignal.evidence.map((ev, i) => (
                                <div key={i} className="flex items-start gap-2 p-2 rounded bg-muted/50 border border-border/50">
                                  <ExternalLink className="w-3 h-3 text-primary mt-1 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs font-display font-semibold text-foreground">{ev.source_name}</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{ev.snippet}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>

      {filteredAssets.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {showWatchlistOnly ? "No watched assets yet. Click ⭐ to add coins to your watchlist." : "No assets to display."}
        </div>
      )}
    </div>
  );
};

const ChangeCell = ({ value }: { value: number | null }) => {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  const isPositive = value > 0;
  const isZero = value === 0;
  const Icon = isZero ? Minus : isPositive ? TrendingUp : TrendingDown;
  const colorClass = isZero ? "text-muted-foreground" : isPositive ? "text-success" : "text-destructive";
  return (
    <span className={`inline-flex items-center gap-1 font-display text-sm ${colorClass}`}>
      <Icon className="w-3.5 h-3.5" />
      {isPositive ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
};

export default AssetsTable;
export type { AISignal, EvidenceItem };
