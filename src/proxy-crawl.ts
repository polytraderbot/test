import { Request, Response } from 'express';  // We'll add express soon

export async function proxyCrawl(req: Request, res: Response) {
  const supabaseUrl = 'https://rvgujmdjjdyqhahlpeao.supabase.co/functions/v1/multi-source-crawl';

  try {
    const response = await fetch(supabaseUrl, {
      method: req.method,                // POST, OPTIONS, etc.
      headers: {
        'Content-Type': 'application/json',
        // Forward any auth headers if your function needs them (e.g. anon key or JWT)
        // 'Authorization': req.headers.authorization || '',
        // Add Supabase anon key if required by the function:
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Z3VqbWRqamR5cWhhaGxwZWFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDMxMzYsImV4cCI6MjA4ODMxOTEzNn0.VqmHFUFhdVeECK7p_2d-IqfJMnRCwmtwsZdnKoWSda8',
      },
      body: req.method !== 'OPTIONS' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();

    // Forward all important headers back
    res.set({
      'Content-Type': 'application/json',
      // If function returns CORS headers, you can copy them — but not needed here
    });

    res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy failed to reach Supabase' });
  }
}
