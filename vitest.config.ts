import { fileURLToPath } from 'node:url'
import { resolve as resolvePath } from 'node:path'
import { realpathSync } from 'node:fs'
import { defineConfig } from 'vitest/config'
import { appIdDefine } from 'deepspace/build'

const appDir = fileURLToPath(new URL('.', import.meta.url))
// Canonical root casing on Windows (see vite.config.ts).
const ROOT = realpathSync.native(process.cwd())

// Dedicated Vitest config, intentionally standalone (Vitest prefers this file
// over vite.config.ts, so the app build config is never loaded for unit tests).
//
// Two reasons it exists:
//   1. vite.config.ts is built for the Cloudflare Worker / rolldown-vite
//      toolchain (@cloudflare/vite-plugin, generouted, vite-plugin-checker).
//      Vitest cannot load those plugins, and they are irrelevant to unit tests.
//   2. Vitest's default `include` would sweep up the Playwright specs in
//      tests/*.spec.ts and fail. Explicit unit-test paths keep the runners
//      separate; Playwright runs via `npm test` / tests/playwright.config.ts.
//
// Unit tests live next to their source. The Node-only prerender test stays at
// the root so it does not enter the browser/Worker TypeScript project in src/.
export default defineConfig({
  root: ROOT,
  // Same app id the bundle is built with, from the same wrangler config —
  // so a unit test importing src/constants.ts sees what the browser will.
  define: appIdDefine({ appDir }),
  resolve: {
    alias: {
      // cwd-relative for the same drive-letter-case reason as vite.config.ts.
      '@': resolvePath(ROOT, 'src'),
    },
  },
  test: {
    // Unit tests only; tests/*.spec.ts are Playwright suites run separately.
    include: ['prerender.test.ts', 'src/**/*.{test,spec}.{ts,tsx}'],
    environment: 'node',
  },
})
