# Spark Fullscreen and Free Drag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Spark out of the Time sidebar into a dedicated fullscreen experience and let its FAB remain anywhere inside the safe viewport.

**Architecture:** Add one isolated `SparkFullscreen` component using the existing Spark store. Restrict shell edits to entry routing and pointer handling; preserve the existing preference shape.

**Tech Stack:** React, TypeScript, Dexie, Vitest, Testing Library, CSS.

## Global Constraints

- Modify only Spark behavior and presentation.
- Do not change other screens, bottom-navigation destinations, or persisted schemas.
- Keep all Spark data in the current real IndexedDB layer.

---

### Task 1: Fullscreen Spark route

**Files:** Create `app/components/SparkFullscreen.tsx`, `app/components/SparkFullscreen.test.tsx`; modify `app/TitiaApp.tsx`, `app/TitiaApp.test.tsx`, `app/globals.css`.

- [ ] Write failing tests asserting the Time sidebar omits Spark and the FAB opens a fullscreen Spark heading.
- [ ] Run the focused tests and confirm the expected failures.
- [ ] Implement the isolated fullscreen component and shell open/close state.
- [ ] Run focused tests and confirm they pass.

### Task 2: Same-gesture free dragging

**Files:** Modify `app/TitiaApp.tsx`, `app/lib/floatingButton.test.ts`, `app/globals.css`.

- [ ] Add a failing interaction assertion proving release preserves a non-edge x coordinate.
- [ ] Remove snap-on-release and start dragging when the one-second hold fires.
- [ ] Persist the clamped position through the existing preference object.
- [ ] Run full tests, lint and build; publish and verify online.
