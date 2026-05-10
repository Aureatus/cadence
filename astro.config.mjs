import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";
import tailwindcss from "@tailwindcss/vite";
import AstroPWA from "@vite-pwa/astro";
import { shield } from "@kindspells/astro-shield";
import { visualizer } from "rollup-plugin-visualizer";
import preloadChunks from "./preload-chunks.ts";
import { fileURLToPath, URL } from "node:url";

const analyze = process.env.ANALYZE === "1";

export default defineConfig({
  output: "static",
  build: {
    inlineStylesheets: "always",
  },
  integrations: [
    svelte(),
    shield({
      sri: { enableStatic: true },
    }),
    preloadChunks(),
    AstroPWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "pwa-source.svg", "apple-touch-icon-180x180.png"],
      manifest: {
        name: "Cadence",
        short_name: "Cadence",
        description: "A local-first cadence tracker for recurring tasks, timing, and adherence.",
        theme_color: "#ef6f35",
        background_color: "#f3efe1",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff,woff2}"],
        navigateFallback: "/",
      },
      devOptions: {
        enabled: true,
        suppressWarnings: true,
      },
    }),
  ],
  vite: {
    build: analyze ? { sourcemap: true } : {},
    plugins: [
      tailwindcss(),
      ...(analyze
        ? [
            visualizer({
              filename: ".analyze/bundle.html",
              gzipSize: true,
              brotliSize: true,
              template: "treemap",
            }),
          ]
        : []),
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  },
});
