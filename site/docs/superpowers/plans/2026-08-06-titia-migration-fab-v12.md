# Titia Migration and Floating Button V1.2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add local encrypted one-click migration, safe legacy-backup merging, restore history, QR support when capacity permits, and a persistent iOS-style floating Spark button.

**Architecture:** Keep AppData V3 as the canonical domain model. Isolate legacy conversion, migration cryptography/merging, persistent snapshots, and pointer geometry into small tested modules; TitiaApp only orchestrates those modules and renders the existing visual language.

**Tech Stack:** React 19, TypeScript, Dexie/IndexedDB, Web Crypto AES-GCM, CompressionStream/DecompressionStream, Vitest, Testing Library, qrcode.

## Global Constraints

- Do not change the current sky background, clouds, rounded cards, iOS style, page layout, or bottom navigation.
- Do not remove or rename existing AppData fields.
- All migration processing and storage stays local; no user content or images are uploaded.
- Migration payload must use `/import#encryptedData`, never `?data=`.
- Import must create a current-data snapshot and merge by ID without overwriting existing records.
- Existing advanced JSON import remains available.
- All settings and imported data persist in IndexedDB.

---

### Task 1: Legacy Backup Adapter

**Files:**
- Create: `app/lib/legacyBackup.ts`
- Test: `app/lib/legacyBackup.test.ts`

**Interfaces:**
- Produces: `isLegacyBackup(value: unknown): boolean`
- Produces: `convertLegacyBackup(value: unknown): { data: AppData; mediaCount: number; warnings: string[] }`

- [ ] Write fixtures containing every legacy table type and tests for record, media, pet, transaction, category, account, budget, settings, and vault conversion.
- [ ] Run the focused test and confirm failure because `legacyBackup.ts` does not exist.
- [ ] Implement strict shape detection and deterministic field mappings. Preserve IDs; convert legacy timestamps to ISO; ignore `deletedAt` rows; retain vault ciphertext without logging it.
- [ ] Run the focused tests and confirm pass.
- [ ] Commit `feat: import legacy Titia backups safely`.

### Task 2: Encrypted Migration Codec and Merge

**Files:**
- Create: `app/lib/migration.ts`
- Test: `app/lib/migration.test.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produces: `encodeMigrationBundle(bundle: MigrationBundle): Promise<string>`
- Produces: `decodeMigrationFragment(fragment: string): Promise<MigrationBundle>`
- Produces: `migrationCounts(bundle: MigrationBundle): MigrationCounts`
- Produces: `mergeMigrationBundle(current: MigrationBundle, incoming: MigrationBundle): MergeResult`
- Produces: `buildMigrationUrl(encoded: string, location: Pick<Location, "origin" | "pathname">): string`

- [ ] Write tests for encrypted round-trip, random ciphertext, tamper rejection, Fragment-only URL, count summary, duplicate-ID skipping, and attachment merging.
- [ ] Run the focused test and confirm the new exports are missing.
- [ ] Implement gzip helpers with browser streams plus AES-GCM and base64url packaging; install `qrcode` only for UI generation.
- [ ] Implement generic array-by-ID merge while retaining all current scalar settings and existing IDs.
- [ ] Run focused and full tests; commit `feat: add encrypted local migration codec`.

### Task 3: Persistent Restore Snapshots

**Files:**
- Modify: `app/lib/store.ts`
- Modify: `app/lib/store.test.ts`

**Interfaces:**
- Produces: `store.createRestoreSnapshot(label, reason): Promise<RestoreSnapshot>`
- Produces: `store.listRestoreSnapshots(): Promise<RestoreSnapshot[]>`
- Produces: `store.restoreSnapshot(id): Promise<AppData>`
- Produces: `store.mergeBundle(bundle): Promise<MergeResult>`

- [ ] Add failing fake-IndexedDB tests for snapshot creation before import, ten-item retention, transactional merge, duplicate skip, attachment persistence, and snapshot restore.
- [ ] Confirm failures are caused by missing Dexie table/methods.
- [ ] Add Dexie schema version 3 with `restoreSnapshots`; perform snapshot plus merge in one transaction.
- [ ] Run focused and full tests; commit `feat: persist migration recovery snapshots`.

### Task 4: Data Management UI and Import Route

**Files:**
- Create: `app/components/DataManagement.tsx`
- Test: `app/components/DataManagement.test.tsx`
- Modify: `app/TitiaApp.tsx`
- Modify: `app/app.css`

**Interfaces:**
- Consumes migration and store APIs from Tasks 1-3.
- Produces an advanced file preview, migration-link generator, capacity-aware QR, `/import#` preview, confirmation, and recovery history UI.

- [ ] Write failing component tests for menu entries, legacy preview counts, migration preview, cancel, confirm, copy link, QR capacity fallback, and restore history.
- [ ] Confirm the component is missing.
- [ ] Implement the component with existing cards/buttons and no page redesign.
- [ ] On app start detect `/import#`, decode locally, show preview, and clear Fragment only after cancel or successful import.
- [ ] Preserve advanced JSON import and change it from overwrite to preview plus merge.
- [ ] Run focused and full tests; commit `feat: add local data migration center`.

### Task 5: Floating Spark Button Geometry and Interaction

**Files:**
- Create: `app/lib/floatingButton.ts`
- Test: `app/lib/floatingButton.test.ts`
- Create: `app/components/SparkFloatingButton.tsx`
- Test: `app/components/SparkFloatingButton.test.tsx`
- Modify: `app/lib/store.ts`
- Modify: `app/TitiaApp.tsx`
- Modify: `app/app.css`

**Interfaces:**
- Produces: `clampFloatingPosition(position, viewport): Position`
- Produces: `snapFloatingPosition(position, viewport): Position`
- Component consumes `preferences.floatingButton` and persists through `onSave`.

- [ ] Write failing tests for default 80%, all viewport bounds, navigation exclusion, left/right snapping, one-second long press, drag state, and save callback.
- [ ] Confirm expected failures.
- [ ] Implement pure geometry first, then the pointer component using capture and long-press timer.
- [ ] Normalize both `floatingButton` and legacy `sparkFab`; save them together for backward compatibility.
- [ ] Run focused and full tests; commit `feat: refine movable Spark floating button`.

### Task 6: Import User Backup, Verify, and Publish

**Files:**
- Modify: `README.md`
- Modify: `public/sw.js`

**Interfaces:**
- Uses the production advanced recovery UI and the user-provided legacy backup.

- [ ] Run Vitest, ESLint, production build, and `git diff --check`.
- [ ] Start the production preview and import the supplied JSON through the visible UI; confirm preview counts and merged data after refresh.
- [ ] Verify the FAB at iPhone viewport sizes, safe-area exclusion, snapping, and saved opacity after refresh.
- [ ] Update privacy, QR capacity, legacy import, and recovery documentation; bump the shell cache.
- [ ] Commit, push to `main`, wait for Pages success, and verify production assets contain the V1.2 features.
