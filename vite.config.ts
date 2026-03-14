import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { readFileSync } from "fs";

const appVersion = (() => {
  try {
    const pkgRaw = readFileSync(path.resolve(__dirname, "package.json"), "utf-8");
    const pkg = JSON.parse(pkgRaw) as { version?: string };
    return pkg.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
})();

export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
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
          if (!id.includes("node_modules")) return;

          // Chunks dedicados apenas para libs realmente pesadas/isoladas
          if (id.includes("jspdf") || id.includes("html2canvas") || id.includes("pdf-lib") || id.includes("xlsx")) {
            return "vendor-pdf-excel";
          }

          if (id.includes("recharts")) {
            return "vendor-charts";
          }

          if (id.includes("@supabase")) {
            return "vendor-supabase";
          }

          // Para o restante, deixar o Rollup decidir automaticamente
          // (evita ciclos entre chunks que podem causar TDZ em produção)
          return;
        },
      },
    },
  },
}));
