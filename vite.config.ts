import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Force new cache to avoid stale bundles (Leaflet named exports fix)
  cacheDir: "node_modules/.vite_zembo_v5",
  optimizeDeps: {
    // Pre-bundle Leaflet so Vite can generate proper ESM wrappers
    include: ["leaflet"],
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Leaflet ships a UMD main; force the official ESM build to avoid "does not provide an export" errors.
      leaflet: path.resolve(__dirname, "node_modules/leaflet/dist/leaflet-src.esm.js"),
    },
  },
}));

