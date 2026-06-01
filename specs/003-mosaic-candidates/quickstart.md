# Quickstart: Phase 2A/2B — Mosaic Candidate Grid

**Branch**: `003-mosaic-candidates` | **Date**: 2026-05-31

---

## No new dependencies

Phase 2A/2B adds no `npm` packages. All generation runs via existing Vitest/TypeScript tooling and the native Web Workers API (no bundler plugin needed for Astro — Vite handles `new Worker(new URL(..., import.meta.url), { type: 'module' })` natively).

---

## New source files

```text
src/lib/candidates/
├── grid.ts              # computeGridKeys, computeNextStep, buildInitialGrid, buildNextGrid
├── cache.ts             # candidateCacheKey, getCached, putCached, hydrateGridFromCache
├── history.ts           # createHistory, pushHistory, revertHistory, activeEntry
├── worker-pool.ts       # spawnCandidateBatch
└── mosaic-worker.ts     # Web Worker entry point (runs in worker thread)

src/components/
├── CandidateGrid.astro       # 3×3 grid display + loading/error states
├── HistoryStrip.astro         # horizontal scrolling history of choices
└── CandidateSection.astro     # wrapper: grid + history strip + Confirm Mosaic button

tests/unit/
├── grid.test.ts          # computeGridKeys, computeNextStep, buildNextGrid
├── cache.test.ts         # candidateCacheKey, hydrateGridFromCache
└── history.test.ts       # pushHistory, revertHistory edge cases
```

---

## Updated source files

```text
src/types/index.ts           Add: CandidateKey, MosaicCandidate, CandidateGrid,
                             HistoryEntry, SelectionHistory, CandidateCache, WorkerInput,
                             WorkerOutput; extend AppState; extend MosaicOptions

src/lib/app-state.ts         Add: onCropConfirmed, onCandidateCellSelected,
                             onHistoryEntryClicked, onWorkerCellReady,
                             onWorkerCellError, onConfirmMosaic;
                             deprecate: onAdjustmentConfirmed (old manual slider)

src/lib/image/adjust.ts      Extract applyAdjustment as a pure function importable
                             by both the main thread and the worker (currently inlined)

src/pages/index.astro        Wire CandidateSection into the page below HeadCropTool;
                             trigger initial batch on crop confirmation

tests/regression/__snapshots__/
mosaic-32x32-candidate.snap.json   New snapshot: (b=0, c=0) candidate; must match
                                    existing mosaic-32x32.snap.json result
mosaic-32x32-candidate-b67c67.snap.json  New snapshot: outer corner candidate
```

---

## Implementation order

Follow this dependency order to keep tests passing at each step:

1. **Types** — add new types to `src/types/index.ts`; verify `pnpm test` still passes
2. **`grid.ts`** — pure math; test-first (`grid.test.ts`)
3. **`cache.ts`** — pure Map operations; test-first (`cache.test.ts`)
4. **`history.ts`** — pure List operations; test-first (`history.test.ts`)
5. **`adjust.ts`** — extract `applyAdjustment`; ensure existing adjustment tests still pass
6. **`mosaic-worker.ts`** — worker entry point; test via integration test that posts a message
7. **`worker-pool.ts`** — orchestrates workers; integration test with mock workers
8. **`app-state.ts`** additions — pure state functions; unit test each transition
9. **Regression snapshots** — generate via `pnpm test --update-snapshots` once worker output is stable
10. **Components** — `CandidateGrid.astro`, `HistoryStrip.astro`, `CandidateSection.astro`
11. **`index.astro`** — wire together; run `pnpm dev` and test interactively
12. **CI** — add `mosaic-32x32-candidate*.snap.json` to snapshot CI check

---

## Development commands

```bash
pnpm dev                          # start dev server
pnpm test                         # run all tests
pnpm test:update                  # update regression snapshots
pnpm test:watch                   # watch mode during development
```

---

## Key constraints to enforce during implementation

- `mosaic-worker.ts` MUST NOT import any browser-DOM API (it runs off the main thread). Use only typed-array and pure-math APIs.
- `applyAdjustment` MUST be a pure function (same pixels in → same pixels out) to satisfy Constitution Principle III.
- Cache keys MUST use `candidateCacheKey()` — never inline the key format.
- `CandidateGrid.cells[4]` MUST always equal the `center` key at construction time.

---

## API fallback path (approved)

Constitution v2.0.0 permits a server-side API fallback under the Principle I first-party ephemeral exception — approved by the project owner on 2026-05-31. Conditions:

1. Ship the Web Workers path first and measure real-device performance.
2. If median generation time exceeds 1.5s and SC-001 (≤3s for all 9 cells) is failing on a meaningful share of target devices, the API fallback may be built.
3. The server endpoint MUST be stateless: no image data persisted, logged, or forwarded to third parties.
4. Document the performance measurement in the PR description before merging the API path.
