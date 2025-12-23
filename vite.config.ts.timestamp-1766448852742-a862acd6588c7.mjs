// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("superdoc")) {
            return "heavy-editor-engine";
          }
          if (id.includes("DocumentEditor")) {
            return "editor-ui";
          }
          if (id.includes("@mui/") || id.includes("@emotion/")) return "mui";
          if (id.includes("@supabase/supabase-js")) return "supabase";
          if (id.includes("@sentry/")) return "sentry";
          if (id.includes("dexie")) return "dexie";
          if (id.includes("swr")) return "swr";
          if (id.includes("@tanstack/react-virtual")) return "virtual";
          if (id.includes("react-router")) return "router";
          if (id.includes("react")) return "react";
          return "vendor";
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ["lucide-react"]
  },
  server: {
    middlewareMode: false,
    port: 5173,
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 5173,
      clientPort: 5173
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3JlYWN0KCldLFxuICBidWlsZDoge1xuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3MoaWQpIHtcbiAgICAgICAgICBpZiAoIWlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMnKSkgcmV0dXJuO1xuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnc3VwZXJkb2MnKSkge1xuICAgICAgICAgICAgcmV0dXJuICdoZWF2eS1lZGl0b3ItZW5naW5lJztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdEb2N1bWVudEVkaXRvcicpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2VkaXRvci11aSc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnQG11aS8nKSB8fCBpZC5pbmNsdWRlcygnQGVtb3Rpb24vJykpIHJldHVybiAnbXVpJztcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcycpKSByZXR1cm4gJ3N1cGFiYXNlJztcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ0BzZW50cnkvJykpIHJldHVybiAnc2VudHJ5JztcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ2RleGllJykpIHJldHVybiAnZGV4aWUnO1xuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnc3dyJykpIHJldHVybiAnc3dyJztcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ0B0YW5zdGFjay9yZWFjdC12aXJ0dWFsJykpIHJldHVybiAndmlydHVhbCc7XG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdyZWFjdC1yb3V0ZXInKSkgcmV0dXJuICdyb3V0ZXInO1xuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygncmVhY3QnKSkgcmV0dXJuICdyZWFjdCc7XG5cbiAgICAgICAgICByZXR1cm4gJ3ZlbmRvcic7XG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGV4Y2x1ZGU6IFsnbHVjaWRlLXJlYWN0J10sXG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIG1pZGRsZXdhcmVNb2RlOiBmYWxzZSxcbiAgICBwb3J0OiA1MTczLFxuICAgIGhtcjoge1xuICAgICAgcHJvdG9jb2w6ICd3cycsXG4gICAgICBob3N0OiAnbG9jYWxob3N0JyxcbiAgICAgIHBvcnQ6IDUxNzMsXG4gICAgICBjbGllbnRQb3J0OiA1MTczLFxuICAgIH0sXG4gIH0sXG59KTsiXSwKICAibWFwcGluZ3MiOiAiO0FBQXlOLFNBQVMsb0JBQW9CO0FBQ3RQLE9BQU8sV0FBVztBQUVsQixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsT0FBTztBQUFBLElBQ0wsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sYUFBYSxJQUFJO0FBQ2YsY0FBSSxDQUFDLEdBQUcsU0FBUyxjQUFjLEVBQUc7QUFDbEMsY0FBSSxHQUFHLFNBQVMsVUFBVSxHQUFHO0FBQzNCLG1CQUFPO0FBQUEsVUFDVDtBQUNBLGNBQUksR0FBRyxTQUFTLGdCQUFnQixHQUFHO0FBQ2pDLG1CQUFPO0FBQUEsVUFDVDtBQUNBLGNBQUksR0FBRyxTQUFTLE9BQU8sS0FBSyxHQUFHLFNBQVMsV0FBVyxFQUFHLFFBQU87QUFDN0QsY0FBSSxHQUFHLFNBQVMsdUJBQXVCLEVBQUcsUUFBTztBQUNqRCxjQUFJLEdBQUcsU0FBUyxVQUFVLEVBQUcsUUFBTztBQUNwQyxjQUFJLEdBQUcsU0FBUyxPQUFPLEVBQUcsUUFBTztBQUNqQyxjQUFJLEdBQUcsU0FBUyxLQUFLLEVBQUcsUUFBTztBQUMvQixjQUFJLEdBQUcsU0FBUyx5QkFBeUIsRUFBRyxRQUFPO0FBQ25ELGNBQUksR0FBRyxTQUFTLGNBQWMsRUFBRyxRQUFPO0FBQ3hDLGNBQUksR0FBRyxTQUFTLE9BQU8sRUFBRyxRQUFPO0FBRWpDLGlCQUFPO0FBQUEsUUFDVDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDLGNBQWM7QUFBQSxFQUMxQjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sZ0JBQWdCO0FBQUEsSUFDaEIsTUFBTTtBQUFBLElBQ04sS0FBSztBQUFBLE1BQ0gsVUFBVTtBQUFBLE1BQ1YsTUFBTTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sWUFBWTtBQUFBLElBQ2Q7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
