import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function createScrape(url: string) {
  const { data, error } = await supabase
    .from("scrapes")
    .insert({ url })
    .select("*")
    .single();
  if (error) throw new Error(`createScrape failed: ${error.message}`);
  return data;
}

export async function insertAssets(scrape_id: string, assets: Array<{
  name: string;
  symbol: string;
  price?: number | null;
  change_24h?: number | null;
  market_cap?: number | null;
  source_url?: string | null;
}>) {
  if (assets.length === 0) return [];
  const rows = assets.map((a) => ({
    scrape_id,
    name: a.name,
    symbol: a.symbol,
    price: a.price ?? null,
    change_24h: a.change_24h ?? null,
    market_cap: a.market_cap ?? null,
    source_url: a.source_url ?? null,
  }));
  const { data, error } = await supabase.from("assets").insert(rows).select("*");
  if (error) throw new Error(`insertAssets failed: ${error.message}`);
  return data;
}

export async function getAssetsByScrape(scrape_id: string) {
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("scrape_id", scrape_id)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`getAssetsByScrape failed: ${error.message}`);
  return data || [];
}

export async function getLatestScrape() {
  const { data, error } = await supabase
    .from("scrapes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getLatestScrape failed: ${error.message}`);
  return data;
}

export async function listScrapes(limit = 50) {
  const { data, error } = await supabase
    .from("scrapes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listScrapes failed: ${error.message}`);
  return data || [];
}

export async function saveStory(scrape_id: string, story_json: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("stories")
    .insert({ scrape_id, story_json })
    .select("*")
    .single();
  if (error) throw new Error(`saveStory failed: ${error.message}`);
  return data;
}

export async function getStoryByScrape(scrape_id: string) {
  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .eq("scrape_id", scrape_id)
    .maybeSingle();
  if (error) throw new Error(`getStoryByScrape failed: ${error.message}`);
  return data;
}
