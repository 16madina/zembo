import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Force new cache to avoid stale bundles
  cacheDir: "node_modules/.vite_zembo_v2",
  optimizeDeps: {
    // Include leaflet libs to ensure proper bundling with React 18
    include: ["leaflet", "react-leaflet", "@react-leaflet/core"],
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

