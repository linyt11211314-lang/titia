# Titia Smart Ledger V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Titia from screenshot-to-single-draft parsing into a local, review-first intelligent ledger with batch parsing, weighted amounts, duplicate warnings, attachments, balance-safe deletion, and date-grouped bills.

**Architecture:** Keep the React shell and AppData state row, upgrade normalized data to V3, and add a separate Dexie attachment table. Isolate source, category, amount, parsing, duplicate, and grouping rules in pure modules; the UI consumes a batch of review drafts and writes only explicitly selected confirmed transactions.

**Tech Stack:** React 19, TypeScript, Dexie, local browser OCR adapter, Vitest, Testing Library, Vite, GitHub Pages.

## Global Constraints

- Pure PWA, local-first, no login, no image upload.
- Preserve existing visual system, bottom navigation, manual bookkeeping, and IndexedDB data.
- Accuracy is more important than automation; uncertain results never auto-save.
- All production behavior is introduced with a failing test first.
- Category rules map only to the supplied category taxonomy.

---

### Task 1: V3 transactions, attachments, and balance-safe deletion

**Files:**
- Modify: `app/lib/store.ts`
- Modify: `app/lib/store.test.ts`
- Create: `app/lib/attachments.test.ts`

**Interfaces:**
- Produces: `TransactionAttachment`, `TitiaStore.putAttachment()`, `TitiaStore.getAttachment()`, `TitiaStore.deleteTransactionWithAttachment()`, and V3 normalization.
- Preserves: `TitiaStore.balance(transactions, opening)` as the only account balance formula.

- [ ] Add failing tests proving V2 transactions normalize to V3, candidate rows do not affect balances, deleting an expense restores the account balance, deleting income reduces it, and attachment CRUD is keyed by transaction ID.
- [ ] Run focused store tests and confirm failures are missing V3/attachment APIs.
- [ ] Extend `Transaction` with `subcategory`, `merchant`, `sourceProvider`, `imageId`, and `duplicateCheck`; bump `AppData.version` to 3 without altering old values.
- [ ] Add a `transactionAttachments` Dexie table and transactional delete helper that removes both transaction state and its attachment.
- [ ] Run focused and existing store tests until green.
- [ ] Commit with `feat: add V3 ledger storage and attachments`.

### Task 2: Deterministic source, amount, category, and duplicate rules

**Files:**
- Create: `app/lib/sourceRules.ts`
- Create: `app/lib/sourceRules.test.ts`
- Create: `app/lib/categoryRules.ts`
- Create: `app/lib/categoryRules.test.ts`
- Create: `app/lib/amountScoring.ts`
- Create: `app/lib/amountScoring.test.ts`
- Create: `app/lib/duplicateDetection.ts`
- Create: `app/lib/duplicateDetection.test.ts`

**Interfaces:**
- Produces: `detectBillSource(text)`, `scoreAmountCandidates(text)`, `classifyBill(input, history)`, `findDuplicate(candidate, confirmed)`.
- Amount candidates contain `{ amount, score, confidence, label, excluded, evidence }` and remain visible when more than one plausible value exists.

- [ ] Add failing source tests for WeChat, Alipay/Huabei, CMB, CIB, CEB, Taobao, JD, Pinduoduo, 1688, Meituan, Eleme, Didi, Amap, and metro keywords.
- [ ] Implement source rule tables returning provider, account hint, and platform type.
- [ ] Add failing amount tests proving `商品100/优惠20/实付款80` ranks 80 first, balance and total-assets values are excluded, and close candidates require selection.
- [ ] Implement label-aware amount extraction, negative evidence, normalized scores, and ambiguity threshold.
- [ ] Add failing category tests for product > merchant > platform > confirmed history priority and all requested category examples.
- [ ] Implement the independently managed category rule table, matching only existing parent/child names.
- [ ] Add failing duplicate tests for same date/amount/merchant/account, time-window penalties, and non-blocking similarity thresholds.
- [ ] Implement weighted similarity and matched transaction ID output.
- [ ] Run all rule tests and commit with `feat: add local intelligent bill rules`.

### Task 3: Multi-order parsing and review drafts

**Files:**
- Create: `app/lib/billParser.ts`
- Create: `app/lib/billParser.test.ts`
- Modify: `app/lib/ledger.ts`
- Modify: `app/lib/ledger.test.ts`

**Interfaces:**
- Consumes: rule APIs from Task 2 and `AppData` from Task 1.
- Produces: `parseBillBatch({ text, attachmentId, data }): ReviewBatch` and `reviewDraftToTransaction(draft)`.

- [ ] Add failing tests for a single WeChat receipt, Alipay classification, ambiguous multiple amounts, and ten explicitly separated transactions producing exactly ten drafts.
- [ ] Add failing tests proving weak separators do not invent extra orders and missing amount blocks confirmation.
- [ ] Implement conservative line segmentation using repeated date/time/status/amount anchors.
- [ ] Compose source, amount, category, account, confidence, and duplicate results into editable `ReviewDraft` objects.
- [ ] Preserve all plausible amount candidates and set `needsAmountChoice`, `needsCategoryReview`, and `possibleDuplicate` flags.
- [ ] Convert only valid, explicitly approved drafts to confirmed transactions.
- [ ] Run parser and full library tests; commit with `feat: parse local bill batches into review drafts`.

### Task 4: Intelligent review UI and local attachment workflow

**Files:**
- Create: `app/components/LedgerReview.tsx`
- Create: `app/components/LedgerReview.test.tsx`
- Modify: `app/TitiaApp.tsx`
- Modify: `app/TitiaApp.test.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `ReviewBatch`, `reviewDraftToTransaction`, attachment APIs, existing category/account data.
- Produces: confirmed selected transactions via the existing `setData` path; no write occurs before confirmation.

- [ ] Add failing component tests for upload/text input, multiple amount choices, draft edits, confidence display, repeat warning, selected-only save, batch delete, reparse, and pre-confirmation non-persistence.
- [ ] Add an OCR adapter that uses local browser text detection when available and otherwise keeps the paste-text fallback; never sends image bytes over fetch/XHR.
- [ ] Store the pending image locally, render a preview, parse it into a batch, and open the intelligent review panel.
- [ ] Build editable draft cards with amount candidates, merchant, type, category/subcategory, account, time, confidence, duplicate details, select/delete/reparse actions, and original-image viewer.
- [ ] Default possible duplicates and invalid drafts to unselected; block save until required fields are resolved.
- [ ] Save selected transactions and their attachment mappings, then clear the pending review batch.
- [ ] Add responsive styles matching existing cards and test at 390×844.
- [ ] Run focused UI and full tests; commit with `feat: add local smart bill review`.

### Task 5: Date-grouped bill list and transactional deletion

**Files:**
- Create: `app/lib/transactionGroups.ts`
- Create: `app/lib/transactionGroups.test.ts`
- Create: `app/components/GroupedTransactions.tsx`
- Create: `app/components/GroupedTransactions.test.tsx`
- Modify: `app/TitiaApp.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `groupTransactionsByLocalDate(transactions)` and grouped list callbacks `onDelete(transaction)` / `onOpenAttachment(transaction)`.
- Consumes: `TitiaStore.deleteTransactionWithAttachment()` from Task 1.

- [ ] Add failing grouping tests proving same-day rows form one group with income/expense totals and local dates sort descending.
- [ ] Add failing component tests for collapsed date cards, expand interaction, attachment link, and confirmed deletion.
- [ ] Implement pure grouping and date summary calculation.
- [ ] Replace per-transaction top-level cards with one expandable card per date while preserving transaction detail and delete affordance.
- [ ] Route deletion through the transactional helper, refresh AppData, and verify account balance rollback immediately.
- [ ] Run focused and full tests; commit with `feat: group bills and roll back deleted transactions`.

### Task 6: Privacy, migration, and publication verification

**Files:**
- Modify: `README.md`
- Modify: `public/sw.js` only if cache manifest/version requires it

**Interfaces:**
- Validates the complete V3 system and public `/titia/` deployment.

- [ ] Document V3 fields, attachment retention, OCR fallback, duplicate thresholds, balance formula, and local-only privacy behavior.
- [ ] Run `vitest run`, ESLint, and the production Vite build; require zero failures.
- [ ] Run the production site at `/titia/`, validate AI review and grouped bills at 390×844, and inspect console errors.
- [ ] Verify no uploaded image triggers network requests and offline-cached assets still open the app.
- [ ] Push `main`, wait for GitHub Pages success, and verify the public JS contains the V3 review and duplicate-detection paths.
- [ ] Commit final documentation with `docs: document smart ledger V2` if it was not included in the preceding feature commits.
