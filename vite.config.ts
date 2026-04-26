import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

const DEFAULT_PRODUCTION_API_URL = "https://fechou-backend-g69o.onrender.com";

function normalizeCspSourceList(value: string | undefined): string {
  return String(value ?? "")
    .split(/\s+/)
    .map((source) => source.trim())
    .filter((source) => source && !source.includes("%"))
    .join(" ");
}

function injectCspConnectSrc(extraConnectSrc: string): Plugin {
  return {
    name: "inject-csp-connect-src",
    transformIndexHtml(html) {
      if (!extraConnectSrc) return html;

      return html.replace(
        "connect-src 'self'",
        `connect-src 'self' ${extraConnectSrc}`,
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const extraConnectSrc = normalizeCspSourceList(
    env.VITE_CSP_CONNECT_SRC ||
      env.VITE_API_URL ||
      (mode === "production" ? DEFAULT_PRODUCTION_API_URL : ""),
  );

  return {
    appType: "spa",
    plugins: [injectCspConnectSrc(extraConnectSrc), react(), tailwindcss()],
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
  };
});
