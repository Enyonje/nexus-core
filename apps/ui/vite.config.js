import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Search-engine HTML for public pages is written after the build by scripts/generate-seo-routes.mjs.
// (The previous "vite-plugin-prerender" step was never installed, so it silently did nothing.)
const apiProxy = {
  "/api": {
    target: process.env.VITE_DEV_API_TARGET || "http://localhost:3001",
    changeOrigin: true,
    secure: false,
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, proxy: apiProxy },
  preview: { port: 4173, proxy: apiProxy },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          motion: ["framer-motion"],
          pdf: ["jspdf", "jspdf-autotable", "html2canvas"],
        },
      },
    },
  },
});
