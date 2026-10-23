import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Custom wrapper plugin for vite-plugin-prerender to handle ES module compatibility safely
function esmPrerenderPlugin(options) {
  return {
    name: "esm-prerender",
    apply: "build", // Only run during production builds, never during 'vite dev'
    async closeBundle() {
      try {
        const Prerender = await import("vite-plugin-prerender");
        const plugin = Prerender.default(options);
        if (plugin && typeof plugin.closeBundle === "function") {
          await plugin.closeBundle.call(this);
        }
      } catch (err) {
        console.warn("Prerender execution skipped or failed:", err);
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Tailwind v4 CSS engine
    esmPrerenderPlugin({
      // Static HTML render output directory for Vercel
      staticDir: path.join(__dirname, "dist"),
      // Public marketing and app routes to pre-render for search engines
      routes: [
        "/",
        "/docs",
        "/architecture",
        "/pricing",
        "/subscription",
        "/agents",
        "/agents/cross-border-compliance",
        "/supportops",
        "/tools",
        "/tools/webhook-validator",
        "/tools/auditloganalyzer"
      ],
      rendererOpts: {
        maxConcurrentRoutes: 4,
        renderAfterDocumentEvent: "custom-post-render-event",
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      // ✅ Proxy API calls during local dev to Fastify backend
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: "dist",      // ensures Vercel serves from dist
    emptyOutDir: true,   // clears old files before building
  },
  preview: {
    port: 4173,          // preview server port
  },
});