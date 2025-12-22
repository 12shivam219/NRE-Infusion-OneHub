import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('superdoc')) {
            return 'heavy-editor-engine';
          }
          if (id.includes('DocumentEditor')) {
            return 'editor-ui';
          }
          if (id.includes('@mui/') || id.includes('@emotion/')) return 'mui';
          if (id.includes('@supabase/supabase-js')) return 'supabase';
          if (id.includes('@sentry/')) return 'sentry';
          if (id.includes('dexie')) return 'dexie';
          if (id.includes('swr')) return 'swr';
          if (id.includes('@tanstack/react-virtual')) return 'virtual';
          if (id.includes('react-router')) return 'router';
          if (id.includes('react')) return 'react';

          return 'vendor';
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    middlewareMode: false,
    port: 5173,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
      clientPort: 5173,
    },
  },
});