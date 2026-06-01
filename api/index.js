// Vercel serverless function — self-contained.
//
// The client doesn't actually call any /api/* endpoints for its features
// (everything goes directly to Supabase + the Polygon RPC from the browser),
// so this exists mainly as a health-check + smoke-test surface and to
// avoid 404s on /api/* probes from monitoring.
//
// IMPORTANT: this file MUST be self-contained. Vercel's Node.js runtime
// bundles api/*.js as standalone serverless functions; reaching out to
// TypeScript files under server/ or shared/ will fail at build time.

import express from 'express';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS — same-origin in production but keep permissive for local probes.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
  });
});

app.get('/api/blockchain/info', (_req, res) => {
  res.status(200).json({
    contractAddress: process.env.VITE_CONTRACT_ADDRESS || 'Not configured',
    network: 'Polygon Amoy Testnet',
    demoMode: process.env.VITE_DEMO_MODE === 'true',
    timestamp: new Date().toISOString(),
  });
});

app.use((err, _req, res, _next) => {
  console.error('API Error:', err);
  res.status(err.status || err.statusCode || 500).json({
    message: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
  });
});

export default app;
