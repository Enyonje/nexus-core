import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    outDir: "dist",        // ensures Vercel serves from dist
    emptyOutDir: true,     // clears old files before building
  },
  preview: {
    port: 4173,            // optional: preview server port
  },
});