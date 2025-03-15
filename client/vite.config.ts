import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { replit } from '@replit/vite-plugin-cartographer'
import { shadcnThemeJson } from '@replit/vite-plugin-shadcn-theme-json'
import { runtimeErrorModal } from '@replit/vite-plugin-runtime-error-modal'

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    replit(),
    shadcnThemeJson(),
    runtimeErrorModal()
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
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'web3': ['ethers', 'web3']
        }
      }
    }
  }
})
