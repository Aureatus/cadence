# Cadence

A local-first PWA for tracking recurring tasks by cadence, timing window, and adherence score. Built with Astro SSG + Svelte 5, deployed to Cloudflare Workers via Alchemy IaC.

## Stack

- **Astro 6** static output (`output: "static"`, `inlineStylesheets: "always"`)
- **Svelte 5** with runes (`$state`, `$derived`, `$effect`)
- **Tailwind v4** + **bits-ui** (shadcn-style headless primitives)
- **Geist** sans (no italic file — browser-synthesized obliques)
- **@tanstack/svelte-db** with a localStorage collection adapter
- **valibot** schemas (Standard Schema spec)
- **@vite-pwa/astro** for service worker + manifest, **@kindspells/astro-shield** for SRI
- **Bun** runtime + package manager (`bun@1.3.5`)
- **Cloudflare Workers Static Assets** via **Alchemy** (`alchemy.run.ts`)

## Scripts

| Command                  | What it does                                                     |
| ------------------------ | ---------------------------------------------------------------- |
| `bun dev`                | Astro dev server via `portless` on a stable hostname             |
| `bun run build`          | `astro check && astro build`                                     |
| `bun run preview`        | Serve the built `dist/`                                          |
| `bun run test`           | `bun:test` units for `time.ts` + `cadence.ts` math (TZ=UTC)      |
| `bun run test:e2e`       | Playwright smoke test (create → complete → persist)              |
| `bun run check`          | format-check, lint, knip, jscpd, fallow dead-code/dupes + health |
| `bun run analyze`        | Build with `rollup-plugin-visualizer` → `.analyze/bundle.html`   |
| `bun run deploy`         | `astro build && alchemy deploy` (Cloudflare)                     |
| `bun run deploy:destroy` | Tear down the Alchemy stack                                      |
| `bun run pwa:assets`     | Regenerate PWA icons from `pwa-source.svg`                       |

## Layout

```
src/
  pages/              Astro entry points (index, history)
  layouts/            Shared shell
  components/
    ui/               bits-ui-based primitives (button, dialog, input, …)
    layout/           App chrome
  features/           Page-level feature components
  lib/
    cadence.ts        Presentation helpers (impact, tone, formatting)
    filter.ts         Status / due filters
    utils.ts          cn(), small helpers
  db.ts               TanStack DB collections + valibot schemas
  time.ts             Cadence math (due state, lateness, scoring, streaks)
  test-fixtures/      Shared test data
e2e/                  Playwright suite (one smoke test)
alchemy.run.ts        Cloudflare deploy stack
```

## Testing

26 unit tests (`bun:test`, vitest-compatible API) cover the math: due-state computation, overnight windows, lateness scoring, streak rollups, formatters. `--conditions svelte` is required so Bun resolves the `svelte` export condition for `@tanstack/svelte-db`.

One Playwright test exercises the full DOM path: open app → create cadence → mark complete → assert the completion is persisted to localStorage. Anything tighter than that lives in unit tests.

## CI / CD

`.github/workflows/deploy.yml` runs on every push and PR:

1. **test** job — `bun run check` → `bun run test` → install chromium → `bun run test:e2e`
2. **deploy** job — gated on `needs: test` and `push` to `main`. Runs `bun run build` then `bun alchemy deploy`.

Required secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `ALCHEMY_STATE_TOKEN`.

## Local-first data

State lives entirely in `localStorage` (no backend). The TanStack DB collections in `src/db.ts` serialize each entry under a versioned key so optimistic updates from the UI don't tear. Wiping site data resets the app.
