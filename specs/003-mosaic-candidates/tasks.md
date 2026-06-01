# Tasks: Phase 2A/2B — Mosaic Candidate Grid and Iterative Selection

**Input**: Design documents from `specs/003-mosaic-candidates/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on in-progress tasks)
- **[Story]**: Which user story this task belongs to
- File paths are relative to repository root

---

## Phase 1: Setup

**Purpose**: Create the new module directory structure. No new npm dependencies.

- [x] T001 Create `src/lib/candidates/` directory with empty placeholder files: `grid.ts`, `cache.ts`, `history.ts`, `worker-pool.ts`, `mosaic-worker.ts` (each exports `export {}` as a stub)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Types and shared utilities that every user story depends on. MUST complete before Phase 3.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Add new types to `src/types/index.ts`: `CandidateKey`, `MosaicCandidate`, `CandidateGrid`, `HistoryEntry`, `SelectionHistory`, `CandidateCache`, `WorkerInput`, `WorkerOutput` — per `data-model.md`
- [x] T003 Extend `MosaicOptions` in `src/types/index.ts` with optional `brightnessOffset?: number` and `contrastOffset?: number` fields — per `data-model.md`
- [x] T004 Add `candidate-grid` and `mosaic-confirmed` phases to the `AppState` union in `src/types/index.ts`; mark existing `adjusting` and `generating` phases `@deprecated` — per `data-model.md`
- [x] T005 Extract `applyAdjustment(imageData: ImageData, brightnessOffset: number, contrastOffset: number): ImageData` as a standalone pure exported function in `src/lib/image/adjust.ts` (currently inlined in the pipeline); verify `pnpm test` still passes after extraction
- [x] T006 Add `onCropConfirmed` to `src/lib/app-state.ts`: transitions `head-cropping` → `candidate-grid` with initial grid (center=(0,0), step=67, all cells pending), empty history (default entry), empty cache — per `contracts/ui-state.md`

**Checkpoint**: Run `pnpm test` — all existing tests must pass before proceeding.

---

## Phase 3: User Story 1 — View Initial Nine Candidates (Priority: P1) 🎯 MVP

**Goal**: After confirming the crop, show a 3×3 grid of nine mosaic previews with the (0,0) candidate at center; all nine cells populate progressively as workers complete.

**Independent Test**: Confirm a crop → verify nine distinct mosaic thumbnails appear in a 3×3 layout, center cell is visually identical to the existing (0,0) result from Phase 1A, and at least one non-center cell looks visibly brighter or darker.

### Implementation

- [x] T007 [P] [US1] Implement `candidateCacheKey`, `getCached`, `putCached`, `hydrateGridFromCache` in `src/lib/candidates/cache.ts` — per `contracts/pipeline-api.md` Cache module
- [x] T008 [P] [US1] Implement `computeGridKeys`, `computeNextStep`, `buildInitialGrid` in `src/lib/candidates/grid.ts` — per `contracts/pipeline-api.md` Grid module
- [x] T009 [US1] Implement `src/lib/candidates/mosaic-worker.ts`: receive `WorkerInput`, reconstruct `ImageData`, call `applyAdjustment`, call `generateMosaic`, post `WorkerOutput` — depends on T005, T007, T008; per `contracts/pipeline-api.md` Worker entry
- [x] T010 [US1] Implement `spawnCandidateBatch` in `src/lib/candidates/worker-pool.ts`: spawn `min(missing.length, navigator.hardwareConcurrency)` module-type workers, structured-clone `imageBuffer` per worker, call `onCellReady`/`onCellError` as results arrive, honour `AbortSignal` — depends on T009; per `contracts/pipeline-api.md` Worker pool
- [x] T011 [US1] Add `onWorkerCellReady` and `onWorkerCellError` to `src/lib/app-state.ts`: update `grid.cells[index]` status and mosaic — per `contracts/ui-state.md`
- [x] T012 [US1] Create `src/components/CandidateGrid.astro`: 3×3 grid of square cells; loading spinner for `pending` cells, mosaic thumbnail for `ready` cells (letterboxed, aspect-ratio maintained), grey placeholder + error icon for `error` cells; no click handlers yet — per `contracts/ui-state.md` UI rendering rules
- [x] T013 [US1] Create `src/components/CandidateSection.astro`: wrapper containing `CandidateGrid`, a placeholder `<div>` for the history strip, and a disabled Confirm Mosaic button; instructional text above grid reads "Click a candidate to refine your selection"
- [x] T014 [US1] Wire US1 into `src/pages/index.astro`: call `onCropConfirmed` on crop confirmation event, set `AbortController`, call `spawnCandidateBatch`, dispatch `onWorkerCellReady`/`onWorkerCellError` results to state, render `CandidateSection` in `candidate-grid` phase — depends on T010, T011, T013
- [x] T015 [US1] Generate regression snapshot `tests/regression/__snapshots__/mosaic-32x32-candidate.snap.json` (b=0, c=0) via `pnpm test:update`; verify result matches existing `mosaic-32x32.snap.json`
- [x] T016 [P] [US1] Unit tests for `computeGridKeys` (center values, step arithmetic, ±100 clamping) and `computeNextStep` (halving, minimum-1 floor) in `tests/unit/grid.test.ts`
- [x] T017 [P] [US1] Unit tests for `candidateCacheKey` (key format), `hydrateGridFromCache` (partial hit, full miss, full hit) in `tests/unit/cache.test.ts`

**Checkpoint**: `pnpm dev` → confirm a crop → nine cells appear (with progressive loading), center cell matches Phase 1A result. `pnpm test` passes.

---

## Phase 4: User Story 2 — Iterate by Selecting a Grid Candidate (Priority: P2)

**Goal**: Clicking a non-center grid cell adds it to the history strip and regenerates the grid centered on it with half the previous step size.

**Independent Test**: Starting from the initial grid, click the top-right cell (+67,+67). Verify: (1) that cell becomes center of new grid, (2) new surrounding cells are at ±33, (3) history strip shows the default and the selected candidate, (4) a second click narrows to ±16.

### Implementation

- [x] T018 [US2] Add `buildNextGrid` to `src/lib/candidates/grid.ts`: takes `selectedKey` + `currentStep`, returns new `CandidateGrid` centered on `selectedKey` with `computeNextStep(currentStep)` — per `contracts/pipeline-api.md`
- [x] T019 [P] [US2] Implement `createHistory`, `pushHistory`, `activeEntry` in `src/lib/candidates/history.ts` — per `contracts/pipeline-api.md` History module
- [x] T020 [US2] Add `onCandidateCellSelected` to `src/lib/app-state.ts`: validates cell is `ready` and non-center, calls `pushHistory`, calls `buildNextGrid`, calls `hydrateGridFromCache` — depends on T018, T019; per `contracts/ui-state.md`
- [x] T021 [US2] Add click handlers to `src/components/CandidateGrid.astro`: emit a `cell-selected` event for `ready` non-center cells; center cell (index 4) is not clickable; `pending`/`error` cells are not clickable
- [x] T022 [US2] Create `src/components/HistoryStrip.astro`: horizontal scrolling strip; renders each `HistoryEntry` as a mosaic thumbnail; active entry (index === activeIndex) has blue outline; no click handlers yet
- [x] T023 [US2] Replace the history strip placeholder in `src/components/CandidateSection.astro` with `HistoryStrip`
- [x] T024 [US2] Wire `onCandidateCellSelected` into `src/pages/index.astro`: on `cell-selected` event, abort prior `AbortController`, call `onCandidateCellSelected`, create new `AbortController`, spawn new batch for uncached cells — depends on T020, T021
- [x] T025 [US2] Generate regression snapshot `tests/regression/__snapshots__/mosaic-32x32-candidate-b67c67.snap.json` (b=67, c=67) via `pnpm test:update`
- [x] T026 [P] [US2] Append unit tests for `buildNextGrid` to `tests/unit/grid.test.ts`: verify center matches selectedKey, step = floor(currentStep/2) clamped to 1, cells[4].key === center
- [x] T027 [P] [US2] Unit tests for `createHistory` and `pushHistory` (adds entry, discards forward entries after revert point) in `tests/unit/history.test.ts`

**Checkpoint**: `pnpm dev` → click two non-center cells in sequence → verify grid narrows, history strip grows, all previously generated cells reappear instantly from cache. `pnpm test` passes.

---

## Phase 5: User Story 3 — Revert to a Prior Chosen Candidate (Priority: P3)

**Goal**: Clicking a history strip entry recenters the grid on that prior choice, displayed instantly from cache; forward entries remain visible but de-emphasised until a new grid selection is made.

**Independent Test**: Iterate forward 3 times (history has 4 entries). Click entry #2. Verify: (1) grid recenters on entry #2's candidate instantly, (2) entries #3 and #4 are visible but dimmed, (3) clicking a new grid cell replaces entries #3 and #4 with the new entry.

### Implementation

- [x] T028 [US3] Add `revertHistory` to `src/lib/candidates/history.ts`: sets `activeIndex` to `targetIndex` without truncating forward entries — per `contracts/pipeline-api.md`
- [x] T029 [US3] Add `onHistoryEntryClicked` to `src/lib/app-state.ts`: calls `revertHistory`, builds a new fully-cache-hydrated `CandidateGrid` from the history entry's key and stepSize, returns new state — depends on T028; per `contracts/ui-state.md`
- [x] T030 [US3] Add click handlers and de-emphasised styling to `src/components/HistoryStrip.astro`: entries after `activeIndex` are dimmed (e.g., `opacity: 0.4`) and still clickable; all entries except the active one emit a `history-selected` event on click
- [x] T031 [US3] Wire `onHistoryEntryClicked` into `src/pages/index.astro`: on `history-selected` event, abort prior `AbortController` (cancels any in-progress generation), call `onHistoryEntryClicked`, re-render grid from cache — depends on T029, T030
- [x] T032 [P] [US3] Append unit tests for `revertHistory` to `tests/unit/history.test.ts`: test that forward entries are preserved, activeIndex updates correctly, re-advancing after revert discards the forward entries

**Checkpoint**: `pnpm dev` → iterate forward 3× → click an earlier history entry → grid appears instantly, forward entries dimmed. Click a grid cell → forward entries replaced. `pnpm test` passes.

---

## Phase 6: User Story 4 — Confirm the Chosen Mosaic (Priority: P4)

**Goal**: The center grid cell, most-recent active history entry, and Confirm Mosaic button share a consistent blue outline; clicking Confirm Mosaic proceeds with the current choice.

**Independent Test**: After any number of iterations, verify all three blue-outlined elements refer to the same (b,c) candidate. Click Confirm Mosaic — verify the app transitions to `mosaic-confirmed` phase carrying the correct `Mosaic` object.

### Implementation

- [x] T033 [US4] Add `onConfirmMosaic` to `src/lib/app-state.ts`: transitions `candidate-grid` → `mosaic-confirmed` using `grid.cells[4].mosaic` and `activeEntry(history).key` — per `contracts/ui-state.md`
- [x] T034 [US4] Add Confirm Mosaic button to `src/components/CandidateSection.astro`: blue outline when `grid.cells[4].status === 'ready'`; disabled (grey outline) when `pending`; emits `confirm-mosaic` event on click
- [x] T035 [US4] Apply blue outline to center cell (index 4) when `status === 'ready'` in `src/components/CandidateGrid.astro`; use the same CSS token/class as the Confirm Mosaic button
- [x] T036 [US4] Apply blue outline to the active history entry (`index === activeIndex`) in `src/components/HistoryStrip.astro`; use the same CSS token/class
- [x] T037 [US4] Add instructional / minimum-step notice above grid in `src/components/CandidateSection.astro`: show "Click a candidate to refine your selection" when `grid.atMinimumStep === false`; replace with "Maximum refinement reached — click Confirm Mosaic to continue" when `grid.atMinimumStep === true`
- [x] T038 [US4] Wire `onConfirmMosaic` into `src/pages/index.astro`: on `confirm-mosaic` event, call `onConfirmMosaic`, transition to `mosaic-confirmed` phase; render a placeholder "Mosaic confirmed" screen (full result screen is out of scope for this feature)

**Checkpoint**: `pnpm dev` → confirm crop → iterate a few times → verify blue outline connects center cell, active history entry, and Confirm button. Iterate until step=1 → verify minimum-refinement notice appears. Click Confirm Mosaic → verify app transitions. `pnpm test` passes.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Hardening, observability, and cross-browser validation.

- [x] T039 [P] Add boundary-clamping unit tests to `tests/unit/grid.test.ts`: verify that `computeGridKeys` clamps all output values to [−100, 100] when center is near the boundary (e.g., center=(90,90), step=67)
- [x] T040 [P] Add `performance.now()` instrumentation around the `generateMosaic` call in `src/lib/candidates/mosaic-worker.ts`: post generation duration as part of `WorkerOutput` (optional field `durationMs?: number`); log to console in `worker-pool.ts` for benchmarking
- [x] T041 N/A — minimum-step flow superseded: bisection algorithm replaced mid-implementation with user-controlled distance dropdown (1–10); `atMinimumStep` is always `false`; no minimum-step notice is shown. Distance 1 is the effective minimum and requires no special UI.
- [ ] T042 Cross-browser smoke test per SC-006: test full flow (crop confirm → iterate ×2 → revert → confirm) in Chrome (latest), Firefox (latest), Safari (latest) — deferred to post-merge manual QA
- [ ] T043 Update CI configuration to run `mosaic-32x32-candidate*.snap.json` snapshots on every PR touching `src/lib/` — deferred to CI sprint

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all user story phases**
- **Phase 3 (US1)**: Depends on Phase 2 — first deliverable (MVP)
- **Phase 4 (US2)**: Depends on Phase 3 (needs initial grid, cache, and worker infrastructure)
- **Phase 5 (US3)**: Depends on Phase 4 (needs history strip and selection state)
- **Phase 6 (US4)**: Depends on Phase 3 (needs center cell state) + Phase 5 (needs active history entry)
- **Phase 7 (Polish)**: Depends on Phase 6 completion

### Within Each Phase

- Tasks marked [P] within the same phase can be worked in parallel
- In Phase 3: T007 and T008 can run in parallel; T009 depends on both; T010 depends on T009
- In Phase 4: T018 and T019 can run in parallel; T020 depends on both
- In Phase 6: T034, T035, T036 can run in parallel; all depend on T033

### Parallel Opportunities

```bash
# Phase 2 — run simultaneously:
T002 (type additions)
T003 (MosaicOptions extension)
T004 (AppState extension)
# T005 and T006 depend on T002-T004

# Phase 3 — run simultaneously first:
T007 (cache.ts)    T008 (grid.ts)    T016 (grid tests)    T017 (cache tests)
# Then T009 after T007+T008

# Phase 4 — run simultaneously:
T018 (buildNextGrid)    T019 (history.ts)    T026 (grid tests)    T027 (history tests)

# Phase 7 — run simultaneously:
T039 (boundary tests)    T040 (perf instrumentation)
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1
4. **STOP AND VALIDATE**: Confirm crop → nine cells load progressively → center matches Phase 1A result
5. Demo-ready milestone

### Incremental Delivery

1. Phases 1–3 → **MVP**: grid loads with 9 candidates
2. Phase 4 → **US2**: clicking narrows the search
3. Phase 5 → **US3**: history revert works
4. Phase 6 → **US4**: confirm action complete, blue highlights connected
5. Phase 7 → hardened, cross-browser, CI

---

## Notes

- Workers must use `{ type: 'module' }` — Vite/Astro handles bundling automatically with `new Worker(new URL(..., import.meta.url), { type: 'module' })`
- The blue outline in US4 MUST use a single shared CSS token so all three elements are visually consistent without a literal connecting line
- Cache keys MUST use `candidateCacheKey()` — never inline the `"b:c"` format
- `grid.cells[4]` MUST always equal `grid.center` at construction time — enforce this in `buildInitialGrid` and `buildNextGrid`
- If performance measurement (T040) shows median worker time > 1.5s on test devices, the API fallback path is approved — document the measurement in the PR before starting API work
