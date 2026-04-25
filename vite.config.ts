import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => ({
  appType: "spa",
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
      "@assets": fileURLToPath(new URL("./attached_assets", import.meta.url)),
    },
  },
  server: {
    host: "localhost",
    port: 5173,
    strictPort: true,
    proxy:
      mode === "development"
        ? {
            "/api": {
              target: "http://localhost:3001",
              changeOrigin: true,
              secure: false,
            },
          }
        : undefined,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
}));
