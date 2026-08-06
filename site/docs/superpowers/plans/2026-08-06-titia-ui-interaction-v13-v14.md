# Titia UI / Interaction V1.3–V1.4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the V1.3 life-tool and ledger fixes plus the complete V1.4 Spark module without changing Titia's established visual language or navigation.

**Architecture:** Add focused pure helpers and small components around the existing `TitiaApp` shell. Upgrade persisted data through `normalizeAppData`, extend Dexie with Spark media, and keep all old fields readable.

**Tech Stack:** React 19, TypeScript, Dexie/IndexedDB, Vitest/Testing Library, Vite PWA.

## Global Constraints

- Preserve the existing sky, cloud, translucent card, rounded iOS style and five-item bottom navigation.
- Persist every new value through the existing store; no temporary mock data.
- Keep data local, preserve AES-GCM vault encryption, and maintain old backup compatibility.
- Use test-first changes and run the full test/lint/build suite before publishing.

---

### Task 1: Date-safe life tools

**Files:** Create `app/lib/lifeDates.ts`, `app/lib/lifeDates.test.ts`, `app/components/PeriodCalendar.tsx`; modify `app/TitiaApp.tsx`, `app/globals.css`.

- [ ] Write failing tests proving invalid countdown dates return a pending state and period calendar cells identify period, prediction and today.
- [ ] Run `pnpm vitest run app/lib/lifeDates.test.ts` and confirm failure.
- [ ] Implement `countdownStatus()`, `buildPeriodCalendar()` and month navigation.
- [ ] Render the horizontal countdown card and calendar with swipe/buttons.
- [ ] Run focused tests and commit `feat: improve period and countdown views`.

### Task 2: Vault modal

**Files:** Create `app/components/VaultAccessSheet.tsx`, `app/components/VaultAccessSheet.test.tsx`; modify `app/TitiaApp.tsx`, `app/globals.css`.

- [ ] Write failing tests for mismatch validation, setup callback and unlock callback.
- [ ] Run the focused test and confirm failure.
- [ ] Implement a controlled setup/unlock sheet that only passes the password to existing crypto functions.
- [ ] Replace browser prompts and verify create, lock-state and unlock flows.
- [ ] Commit `fix: add secure vault setup and unlock sheet`.

### Task 3: Ledger batch, asset and category management

**Files:** Create `app/lib/ledgerManagement.ts`, `app/lib/ledgerManagement.test.ts`, `app/components/CategoryManager.tsx`; modify `app/components/GroupedTransactions.tsx`, its tests, `app/TitiaApp.tsx`, `app/lib/store.ts`, `app/globals.css`.

- [ ] Write failing tests for asset/liability grouping, category add/rename/delete and batch selection/actions.
- [ ] Implement pure grouping/category helpers and preserve customized categories in normalization.
- [ ] Add long-press selection plus batch delete/category/account controls; delete attachments through the store.
- [ ] Split the asset view and replace read-only category chips with editable hierarchy controls.
- [ ] Run focused tests and commit `feat: add ledger batch and category management`.

### Task 4: Persistent Spark module and media

**Files:** Create `app/lib/sparkNotes.ts`, `app/lib/sparkNotes.test.ts`, `app/components/SparkNotes.tsx`, `app/components/SparkNotes.test.tsx`; modify `app/lib/store.ts`, `app/lib/migration.ts`, their tests, `app/TitiaApp.tsx`, `app/globals.css`.

- [ ] Write failing tests for legacy conversion, tag filtering, note CRUD, media persistence and migration counts/merge.
- [ ] Add `SparkNote`, `SparkMedia`, `sparkNotes`, Dexie v4 `sparkMedia`, and backward-compatible bundle encoding.
- [ ] Build the 时光-side Spark page with filters, cards, detail/edit/delete and optional images.
- [ ] Upgrade the existing Spark sheet and route FAB clicks to the same persisted create flow.
- [ ] Verify drag, snap, opacity and refresh persistence remain green; commit `feat: add complete Spark notes module`.

### Task 5: Release verification

**Files:** Modify `public/sw.js`; create `docs/V1.4-ui-interaction.md`.

- [ ] Run `pnpm vitest run`, `pnpm lint`, and `pnpm build` with zero failures.
- [ ] Inspect the production build and increment the service-worker cache key.
- [ ] Document changed files, schema changes and compatibility behavior.
- [ ] Commit, push `HEAD:main`, wait for GitHub Pages success, and test the deployed period, vault, ledger and Spark flows.
