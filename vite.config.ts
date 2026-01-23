import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      // Resolve CommonJS dependencies for proper ES module interop
      'react-is': path.resolve(__dirname, 'node_modules/react-is'),
      'prop-types': path.resolve(__dirname, 'node_modules/prop-types'),
      'hoist-non-react-statics': path.resolve(__dirname, 'node_modules/hoist-non-react-statics'),
      'loose-envify': path.resolve(__dirname, 'node_modules/loose-envify'),
      'object-assign': path.resolve(__dirname, 'node_modules/object-assign'),
      // Prefer the ESM wrapper for supabase to avoid CJS interop leakage
      '@supabase/supabase-js': path.resolve(
        __dirname,
        'node_modules/@supabase/supabase-js/dist/esm/wrapper.mjs'
      ),
    },
  },
  plugins: [
    react({
      // ⚡ Optimize JSX compilation in dev mode (use esbuild in dev)
      jsxRuntime: 'automatic',
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          
          // ⚡ Split heavy editor first
          if (id.includes('superdoc')) {
            return 'heavy-editor-engine';
          }
          
          // ⚡ Split component-specific code
          if (id.includes('DocumentEditor')) {
            return 'editor-ui';
          }
          if (id.includes('AdminPage')) {
            return 'admin-ui';
          }
          
          // ⚡ Split framework code
          if (id.includes('@mui/material/')) return 'mui-core';
          if (id.includes('@mui/')) return 'mui';
          if (id.includes('@emotion/')) return 'emotion';
          if (id.includes('@supabase/supabase-js')) return 'supabase';
          if (id.includes('@sentry/')) return 'sentry';
          if (id.includes('dexie')) return 'dexie';
          if (id.includes('swr')) return 'swr';
          if (id.includes('@tanstack/react-virtual')) return 'virtual';
          if (id.includes('react-router')) return 'router';
          if (id.includes('react-dom')) return 'react-dom';
          if (id.includes('react')) return 'react';

          return 'vendor';
        },
      },
    },
  },
  optimizeDeps: {
    // ⚡ Pre-bundle ALL CommonJS dependencies and core libraries
    include: [
      // Keep this list minimal to reduce cold-start prebundling
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      '@emotion/react',
      // Prebundle Sentry and SuperDoc to avoid CJS runtime issues
      '@sentry/react',
      '@harbour-enterprises/superdoc',
      // CommonJS-heavy packages that sometimes leak `exports` into browser bundles
      'crypto-js',
      'localforage',
      'email-addresses',
      'web-streams-polyfill',
      'uuid',
      '@mui/x-data-grid',
      '@mui/icons-material',
      'hoist-non-react-statics',
      'use-sync-external-store',
      'use-sync-external-store/shim',
      'zod-validation-error',
    ],
    // ⚡ Only exclude very large/slow-to-optimize packages
    // Keep excludes minimal — ensure supabase is prebundled / resolved to ESM
    exclude: [],
    // ⚡ Increase esbuild cache to avoid reprocessing
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
      supported: {
        bigint: false,
      },
    },
  },
  server: {
    middlewareMode: false,
    port: 5173,
    // ⚡ Disable warmup to speed up initial startup (files load on demand)
    // warmup is disabled - this reduces startup time but slightly increases first page load
    
    // ⚡ Optimize HMR
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
      clientPort: 5173,
    },
    // ⚡ Watch settings optimization
    watch: {
      // Ignore node_modules and other heavy folders
      ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**', '**/dist/**'],
      usePolling: false,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 100,
      },
    },
    // ⚡ Disable preload of dependencies on startup
    preTransformRequests: false,
  },
});