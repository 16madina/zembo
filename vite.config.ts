import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Force new cache to avoid stale bundles (Leaflet DomUtil fix)
  cacheDir: "node_modules/.vite_zembo_v3",
  optimizeDeps: {
    // Exclude leaflet from pre-bundling to avoid CommonJS named export issues
    exclude: ["leaflet"],
  },
  build: {
    commonjsOptions: {
      // Transform leaflet CommonJS exports correctly
      include: [/leaflet/, /node_modules/],
    },
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

