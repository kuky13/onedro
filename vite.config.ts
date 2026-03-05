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
            // Separar apenas bibliotecas muito grandes e independentes para evitar chunks gigantes
            if (id.includes("jspdf") || id.includes("html2canvas") || id.includes("pdf-lib") || id.includes("xlsx")) {
              return "vendor-pdf-excel";
            }
            if (id.includes("recharts")) {
              return "vendor-charts";
            }
            // Manter React e libs de UI juntos para evitar erros de inicialização (forwardRef undefined)
            // Otimização: Manter libs core juntas
            return "vendor";
          }
        },
      },
    },
  },
}));
