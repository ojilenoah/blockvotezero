// vercel.mjs - A helper script for Vercel deployment
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * This script handles configuration for Vercel deployment
 * It ensures proper environment variable access and routing configuration
 */
export default {
  prebuilds: {
    // Environment setup for API routes
    env: true,
  },
  build: {
    env: {
      // Make environment variables accessible during build
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
      VITE_CONTRACT_ADDRESS: process.env.VITE_CONTRACT_ADDRESS,
      VITE_ALCHEMY_URL: process.env.VITE_ALCHEMY_URL,
      DATABASE_URL: process.env.DATABASE_URL,
    },
  },
  routes: [
    // Serve static assets with caching
    {
      src: '/assets/(.*)',
      headers: { 'cache-control': 'public, max-age=31536000, immutable' },
      continue: true,
    },
    // Handle API routes
    { src: '/api/(.*)', dest: '/api/$1' },
    // Serve all other routes from the SPA
    { src: '/(.*)', dest: '/index.html' },
  ],
};

// Log successful config setup
console.log('Vercel deployment configuration loaded successfully');