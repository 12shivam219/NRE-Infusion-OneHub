import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      // Clean alias pointing to src only
      '@': path.resolve(__dirname, './src'), 
    },
  },
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Group UI libraries to prevent waterfall loading
            if (id.includes('@mui') || id.includes('@emotion') || id.includes('lucide')) {
              return 'ui-vendor';
            }
            // Keep heavy editors separate
            if (id.includes('superdoc')) {
              return 'editor-engine';
            }
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            // Group everything else into vendor
            return 'vendor';
          }
        },
      },
    },
  },
  optimizeDeps: {
    // Vite 7 auto-discovers dependencies very well. 
    // Only add packages here if you see specific "Pre-bundling" errors in the console.
    include: [], 
  },
  server: {
    port: 5173,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
    },
  },
});