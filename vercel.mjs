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
    // Handle API routes through the serverless function
    { src: '/api/(.*)', dest: '/api/$1' },
    // Serve all other routes from the SPA
    { src: '/(.*)', dest: '/index.html' },
  ],
};

// Function to handle deployment environment variable setup
export async function setupEnv() {
  try {
    // Log environment setup for debugging
    console.log('Setting up Vercel deployment environment variables');
    
    // Required environment variables for the application
    const requiredEnvVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
      'VITE_CONTRACT_ADDRESS',
      'VITE_ALCHEMY_URL'
    ];
    
    // Check if all required environment variables are set
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.warn(`Warning: Missing environment variables: ${missingVars.join(', ')}`);
      console.warn('These should be configured in your Vercel project settings.');
    } else {
      console.log('All required environment variables are set correctly.');
    }
    
    return true;
  } catch (error) {
    console.error('Error setting up environment variables:', error);
    return false;
  }
}

// Log successful config setup
console.log('Vercel deployment configuration loaded successfully');