-- Create scrapes table
CREATE TABLE public.scrapes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assets table
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scrape_id UUID NOT NULL REFERENCES public.scrapes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  price NUMERIC,
  change_24h NUMERIC,
  market_cap NUMERIC,
  source_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stories table
CREATE TABLE public.stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scrape_id UUID NOT NULL REFERENCES public.scrapes(id) ON DELETE CASCADE,
  story_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.scrapes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for MVP (no auth)
CREATE POLICY "Allow all access to scrapes" ON public.scrapes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to assets" ON public.assets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to stories" ON public.stories FOR ALL USING (true) WITH CHECK (true);

-- Index for faster lookups
CREATE INDEX idx_assets_scrape_id ON public.assets(scrape_id);
CREATE INDEX idx_stories_scrape_id ON public.stories(scrape_id);