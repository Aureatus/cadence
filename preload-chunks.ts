import type { AstroIntegration } from "astro";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

// Cold-path chunk name patterns that the AppRoot island statically depends on.
// Lazy chunks (dialogs, history-page, dev-seed-button, add-todo-form) are NOT
// listed — they're loaded on demand and preloading them would defeat the split.
const COLD_PATH_CHUNK_PATTERNS = [
  /^Icon\..+\.js$/,
  /^branches\..+\.js$/,
  /^app-root\..+\.js$/,
  /^client\.svelte\..+\.js$/,
  /^snippet\..+\.js$/,
];

export default function preloadChunks(): AstroIntegration {
  return {
    name: "preload-cold-chunks",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        const distDir = fileURLToPath(dir);
        const astroDir = join(distDir, "_astro");

        const files = await readdir(astroDir);
        const coldChunks = files
          .filter((f) => COLD_PATH_CHUNK_PATTERNS.some((p) => p.test(f)))
          .map((f) => `/_astro/${f}`);

        const preloadLinks = coldChunks
          .map((href) => `<link rel="modulepreload" href="${href}">`)
          .join("");

        async function injectInto(d: string) {
          const entries = await readdir(d, { withFileTypes: true });
          for (const entry of entries) {
            const p = join(d, entry.name);
            if (entry.isDirectory()) await injectInto(p);
            else if (entry.name.endsWith(".html")) {
              const html = await readFile(p, "utf-8");
              if (html.includes('rel="modulepreload"')) continue;
              await writeFile(p, html.replace("</head>", `${preloadLinks}</head>`));
            }
          }
        }

        await injectInto(distDir);
      },
    },
  };
}
