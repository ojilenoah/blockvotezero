import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import shadcnThemeJson from '@replit/vite-plugin-shadcn-theme-json'
import runtimeErrorModal from '@replit/vite-plugin-runtime-error-modal'

// Only import cartographer in development
const devPlugins = process.env.NODE_ENV !== 'production'
  ? [import('@replit/vite-plugin-cartographer').then(m => m.cartographer())]
  : [];

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    shadcnThemeJson(),
    runtimeErrorModal(),
    ...(await Promise.all(devPlugins))
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: {
      clientPort: 443
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false, // Disable sourcemaps in production for better performance
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'web3': ['ethers', 'web3']
        }
      }
    }
  },
  // Prevents absolute paths in the build
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})