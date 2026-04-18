
-- Add confidence_score, risk_tags, beginner_explanation to signals table
ALTER TABLE public.signals 
  ADD COLUMN IF NOT EXISTS confidence_score integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS risk_tags jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS beginner_explanation text;

-- Create signal_evidence table
CREATE TABLE IF NOT EXISTS public.signal_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id uuid REFERENCES public.signals(id) ON DELETE CASCADE NOT NULL,
  source_name text NOT NULL,
  page_url text,
  snippet text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.signal_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to signal_evidence" ON public.signal_evidence
  FOR ALL USING (true) WITH CHECK (true);

-- Create watchlist table
CREATE TABLE IF NOT EXISTS public.watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid REFERENCES public.assets(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to watchlist" ON public.watchlist
  FOR ALL USING (true) WITH CHECK (true);
