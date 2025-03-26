// Vercel serverless function for API routes
import express from 'express';
import { registerRoutes } from '../server/routes';
import { storage } from '../server/storage';
import { setupEnv } from '../vercel.mjs';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Simple logging middleware for Vercel environment
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

// Set up CORS for Vercel deployment
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  
  // Handle OPTIONS method
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    apiVersion: '1.0.0'
  });
});

// Blockchain information endpoint
app.get('/api/blockchain/info', (req, res) => {
  res.status(200).json({
    contractAddress: process.env.VITE_CONTRACT_ADDRESS || 'Not configured',
    network: 'Polygon Amoy Testnet',
    timestamp: new Date().toISOString()
  });
});

// Set up error handling middleware
app.use((err, _req, res, _next) => {
  console.error('API Error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({ 
    message, 
    timestamp: new Date().toISOString() 
  });
});

// Initialize environment variables and server routes
(async () => {
  try {
    // Set up environment variables for Vercel deployment
    await setupEnv();
    
    // Register application routes
    await registerRoutes(app);
    
    console.log('API routes registered successfully');
  } catch (error) {
    console.error('Failed to initialize API server:', error);
  }
})();

// Export the Express API for Vercel
export default app;