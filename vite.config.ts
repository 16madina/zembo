import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Bump cache dir to force Vite to re-optimize deps after react-leaflet downgrade.
  // This prevents stale prebundled code (React 19 `use()` API) from being served.
  cacheDir: "node_modules/.vite_zembo",
  optimizeDeps: {
    // Avoid pre-bundling leaflet/react-leaflet to prevent context/React-version mismatches.
    exclude: ["leaflet", "react-leaflet", "@react-leaflet/core"],
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

