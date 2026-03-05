import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (id.includes("jspdf") || id.includes("html2canvas") || id.includes("pdf-lib") || id.includes("xlsx")) {
              return "vendor-pdf-excel";
            }
            if (id.includes("recharts")) {
              return "vendor-charts";
            }
            if (id.includes("@supabase")) {
              return "vendor-supabase";
            }
            if (id.includes("@radix-ui") || id.includes("cmdk") || id.includes("sonner") || id.includes("vaul") || id.includes("class-variance-authority") || id.includes("tailwind-merge") || id.includes("clsx")) {
              return "vendor-ui";
            }
            if (id.includes("framer-motion")) {
              return "vendor-motion";
            }
            if (id.includes("react-dom") || id.includes("react-router") || id.includes("/react/")) {
              return "vendor-react";
            }
            return "vendor";
          }
        },
      },
    },
  },
}));
