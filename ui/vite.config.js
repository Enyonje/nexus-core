import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // ✅ Proxy API calls during local dev
      "/api": {
        target: "http://localhost:3001", // Fastify backend
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: "dist",        // ensures Vercel/Render serves from dist
    emptyOutDir: true,     // clears old files before building
  },
  preview: {
    port: 4173,            // optional: preview server port
  },
});