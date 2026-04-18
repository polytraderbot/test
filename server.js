const express = require('express');
const path = require('path');
const { proxyCrawl } = require('./src/proxy-crawl');  // Adjust path if needed

const app = express();
app.use(express.json());  // Parse JSON bodies

// Serve static Vite build
app.use(express.static(path.join(__dirname, 'dist')));

// Proxy endpoint
app.all('/api/crawl', proxyCrawl);

// SPA fallback: send index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
