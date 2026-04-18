CREATE TABLE public.reddit_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scrape_id uuid REFERENCES public.scrapes(id) ON DELETE CASCADE,
  subreddit text NOT NULL,
  title text NOT NULL,
  url text,
  snippet text,
  symbols jsonb DEFAULT '[]'::jsonb,
  sentiment_label text DEFAULT 'neutral',
  engagement_score integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  reddit_created_at timestamptz
);

ALTER TABLE public.reddit_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to reddit_posts" ON public.reddit_posts FOR ALL USING (true) WITH CHECK (true);