import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type Scrape = {
  id: string;
  url: string;
  created_at: string;
};

const HistoryPage = () => {
  const [scrapes, setScrapes] = useState<Scrape[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadScrapes();
  }, []);

  const loadScrapes = async () => {
    try {
      const { data, error } = await supabase
        .from("scrapes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setScrapes(data || []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-display font-bold text-foreground mb-6">Scrape History</h1>

      {scrapes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No scrapes yet. <Link to="/scrape" className="text-primary underline">Start scraping</Link></p>
        </div>
      ) : (
        <div className="space-y-3">
          {scrapes.map((s) => (
            <Card key={s.id} className="p-4 bg-card border-border hover:border-primary/30 transition-colors">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-display text-foreground truncate">{s.url}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(s.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/dashboard?scrape_id=${s.id}`}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
