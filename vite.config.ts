
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Definir variáveis de ambiente explicitamente
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || 'https://oghjlypdnmqecaavekyr.supabase.co'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9naGpseXBkbm1xZWNhYXZla3lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NTI3NTcsImV4cCI6MjA2MTUyODc1N30.aor71Dj3pcEa7N82vGdW5MlciiNnl1ISqAimEyPbbJY'),
    'import.meta.env.VITE_DISABLE_EDGE_IMAGE_FUNCTIONS': JSON.stringify(process.env.VITE_DISABLE_EDGE_IMAGE_FUNCTIONS || 'true')
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    // Disabled componentTagger to remove data-lov-* attributes
    // mode === 'development' &&
    // componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'supabase-vendor': ['@supabase/supabase-js'],
          
          // UI chunks
          'ui-components': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip'
          ],
          
          // Utils chunks
          'utils': ['clsx', 'tailwind-merge', 'class-variance-authority'],
          
          // Icons chunk
          'icons': ['lucide-react'],
          
          // Charts chunk (if needed)
          'charts': ['recharts'],
          
          // PDF utilities
          'pdf-utils': ['jspdf', 'pdf-lib', 'file-saver']
        }
      }
    },
    // Enable compression with better error handling
    minify: mode === 'production' ? 'terser' : false,
    terserOptions: mode === 'production' ? {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    } : undefined,
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    sourcemap: mode !== 'production'
  },
  // Enable aggressive tree-shaking
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@tanstack/react-query'
    ]
  }
}));
