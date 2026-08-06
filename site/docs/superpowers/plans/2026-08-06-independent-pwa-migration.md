# Titia Independent PWA Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ChatGPT Sites/Vinext hosting shell with a login-free static Vite PWA while preserving every existing Titia page and local-data behavior.

**Architecture:** Keep the existing application and Dexie store in `app/`, add a standard browser entry, and build to `dist/`. Make PWA URLs base-aware so the same source can deploy at a root domain or a GitHub Pages repository path.

**Tech Stack:** React 19, Vite 8, TypeScript, Dexie, Vitest, native Service Worker, Cloudflare Pages, Vercel, GitHub Actions.

## Global Constraints

- Do not redesign or rewrite existing pages.
- Do not add authentication, registration, user accounts, server storage, or API dependencies.
- Preserve IndexedDB schema and import/export behavior.
- Production output must be static files in `dist/`.

---

### Task 1: Static application entry and build

**Files:**
- Create: `index.html`
- Create: `src/main.tsx`
- Modify: `vite.config.ts`
- Modify: `tsconfig.json`
- Modify: `package.json`
- Modify: `eslint.config.mjs`
- Test: `tests/rendered-html.node-test.mjs`

- [x] Change the rendered HTML test to read `dist/index.html` and assert the title, manifest, root mount, and absence of ChatGPT auth markers.
- [x] Run `pnpm test` and confirm it fails because the old build does not create the expected static entry.
- [x] Add the Vite HTML/React entry and replace Vinext build scripts and plugins.
- [x] Remove unused Sites/Worker/Next dependencies and refresh the lockfile.
- [x] Run unit tests and the full static build test.

### Task 2: Base-aware PWA and deployment configurations

**Files:**
- Modify: `public/manifest.webmanifest`
- Modify: `public/sw.js`
- Modify: `public/register-sw.js`
- Create: `public/_redirects`
- Create: `public/.nojekyll`
- Create: `vercel.json`
- Create: `.github/workflows/pages.yml`
- Test: `tests/pwa-config.node-test.mjs`

- [x] Add a failing configuration test covering relative manifest URLs, base-aware Service Worker registration, deployment outputs, and no authentication redirects.
- [x] Run the test and confirm the expected configuration files are missing or invalid.
- [x] Implement relative PWA URLs, SPA fallbacks, and GitHub Pages workflow.
- [x] Run the configuration test and full test suite.

### Task 3: Remove hosting/authentication shell and verify

**Files:**
- Delete: `.openai/hosting.json`
- Delete: `app/chatgpt-auth.ts`
- Delete: `app/layout.tsx`
- Delete: `app/page.tsx`
- Delete: `build/sites-vite-plugin.ts`
- Delete: `worker/index.ts`
- Delete: `next.config.ts`
- Delete: `next-env.d.ts`
- Delete: `worker-env.d.ts`
- Delete: `drizzle.config.ts`
- Delete: `db/`
- Delete: `drizzle/`
- Delete: `examples/`
- Modify: `README.md`

- [x] Remove only unused ChatGPT Sites, Next/Vinext, Worker, and example database files.
- [x] Document local-only privacy, cross-domain backup/import migration, and all three deployment paths.
- [x] Run `pnpm test`, `pnpm lint`, and `pnpm build` from a clean output directory.
- [x] Serve `dist/` locally and verify direct entry, PWA metadata, core navigation, and no login screen in a browser.
