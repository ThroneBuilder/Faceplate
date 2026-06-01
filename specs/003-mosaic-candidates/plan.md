# Implementation Plan: Phase 2A/2B — Mosaic Candidate Grid and Iterative Selection

**Branch**: `003-mosaic-candidates` | **Date**: 2026-05-31 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-mosaic-candidates/spec.md`

---

## Summary

After the user confirms their head-height crop, display a 3×3 grid of nine mosaic candidates spanning a brightness×contrast search space centered at (0,0) with an initial ±67 step. The user iteratively selects candidates to zoom into preferred regions (step halves each round, minimum 1), reverts to prior choices (served instantly from cache), and confirms the final choice. All nine mosaics are generated concurrently via browser Web Workers — no server required, no constitution amendment needed.

---

## Technical Context

**Language/Version**: TypeScript 5.x + Astro 4.x (unchanged)

**New Dependencies**: None

**Storage**: In-memory `Map<string, Mosaic>` (session cache, never persisted)

**Testing**: Vitest (`environment: 'node'`) — workers mocked in unit tests; integration tests post real messages

**Target Platform**: Browser — Chrome, Firefox, Safari (latest 2 versions); desktop only (SC-006)

**Performance Goals**:
- Initial 9 candidates fully visible: ≤3s (SC-001); first cells appear within ~0.5–1s (progressive)
- Each subsequent iteration: ≤3s (SC-002)
- Revert to cached candidate: <100ms (SC-003)

**Constraints**:
- Client-side only — Web Workers only; no image data to server (Constitution Principles I + II)
- Workers are module-type (`{ type: 'module' }`) — Vite/Astro handles bundling natively
- All pixel operations must be deterministic (Constitution Principle III)

**Scale/Scope**: Single-user browser session; no persistence beyond the session

---

## Constitution Check

*Gates from `.specify/memory/constitution.md` v1.0.0.*

| Gate | Principle | Result | Notes |
|---|---|---|---|
| Client-only processing | I, II | ✅ | Primary path: Web Workers (client-only). API fallback permitted under Principle I first-party ephemeral exception — approved by project owner 2026-05-31. Conditions: performance-justified by measurement, stateless server, no third-party transmission. |
| Deterministic output | III | ✅ | Workers use same deterministic CIEDE2000 pipeline; no canvas interpolation |
| Schema extensibility | IV | ✅ | New types use optional fields; no breaking changes to existing types |
| Snapshot coverage | V | ✅ | Two new regression snapshots: default (0,0) + outer corner (67,67) |
| Algorithmic baseline | VI | ✅ | Full feature works without any AI/LLM; Web Workers are pure deterministic compute |
| TypeScript strict | Constraints | ✅ | All new modules use strict TypeScript |

> **API path approved under Principle I first-party ephemeral exception (constitution v2.0.0)**
>
> The constitution was amended on 2026-05-31 (v1.0.0 → v2.0.0, MAJOR) to permit first-party server-side processing of image data when: performance justification is measured (not estimated), processing is stateless/ephemeral, and no data reaches third parties. The project owner explicitly approved this exception for this feature.
>
> **Implementation order**: Ship the Web Workers path first. If measured performance on real devices fails SC-001/SC-002, the API fallback may be built under the approved exception. See `research.md §1` for the full tradeoff table.

---

## Project Structure

### Documentation (this feature)

```text
specs/003-mosaic-candidates/
├── plan.md              # This file
├── research.md          # Phase 0: parallel generation, algorithm, cache decisions
├── data-model.md        # New types + AppState extensions
├── quickstart.md        # Implementation order, no new deps
├── contracts/
│   ├── pipeline-api.md  # grid, cache, history, worker-pool module contracts
│   └── ui-state.md      # AppState transitions + UI rendering rules
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code Changes

```text
# New files
src/lib/candidates/grid.ts            computeGridKeys, computeNextStep, buildInitialGrid, buildNextGrid
src/lib/candidates/cache.ts           candidateCacheKey, getCached, putCached, hydrateGridFromCache
src/lib/candidates/history.ts         createHistory, pushHistory, revertHistory, activeEntry
src/lib/candidates/worker-pool.ts     spawnCandidateBatch (orchestrates Web Workers)
src/lib/candidates/mosaic-worker.ts   Web Worker entry: reconstruct ImageData → adjust → generateMosaic
src/components/CandidateGrid.astro    3×3 grid with per-cell loading/error states
src/components/HistoryStrip.astro     Horizontal history; active/reverted/forward states
src/components/CandidateSection.astro Wrapper: grid + strip + Confirm Mosaic button
tests/unit/grid.test.ts
tests/unit/cache.test.ts
tests/unit/history.test.ts
tests/regression/__snapshots__/mosaic-32x32-candidate.snap.json        (b=0,c=0)
tests/regression/__snapshots__/mosaic-32x32-candidate-b67c67.snap.json (b=67,c=67)

# Updated files
src/types/index.ts              CandidateKey, MosaicCandidate, CandidateGrid, HistoryEntry,
                                SelectionHistory, CandidateCache, WorkerInput, WorkerOutput;
                                candidate-grid + mosaic-confirmed phases added to AppState;
                                adjusting/generating phases deprecated but retained
src/lib/app-state.ts            onCropConfirmed, onCandidateCellSelected, onHistoryEntryClicked,
                                onWorkerCellReady, onWorkerCellError, onConfirmMosaic added
src/lib/image/adjust.ts         Extract applyAdjustment as pure importable function
src/pages/index.astro           Wire CandidateSection; trigger batch on crop confirm
```

**Structure Decision**: Single Astro project at repo root (unchanged). New candidate logic under `src/lib/candidates/`; new components alongside existing ones in `src/components/`.

---

## Complexity Tracking

| Decision | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Web Workers for generation | 9 sequential generateMosaic calls would take 5–10s; SC-001 requires ≤3s | Running serially blocks UI and fails performance target |
| Progressive cell rendering | SC-001 requires ≤3s but slowest cell may exceed that; progressive shows partial results quickly | All-or-nothing render would show blank grid for full batch duration |
| Constitution API conflict | Spec Q1 clarification allowed first-party server; Constitution Principle I prohibits it | Spec clarification takes precedence over plan only if constitution is amended first |

---

## Phase Artifacts

| Artifact | File | Status |
|---|---|---|
| Feature spec | `specs/003-mosaic-candidates/spec.md` | ✅ Complete (4 clarifications; constitution conflict flagged) |
| Research | `specs/003-mosaic-candidates/research.md` | ✅ Complete |
| Data model | `specs/003-mosaic-candidates/data-model.md` | ✅ Complete |
| Pipeline API contract | `specs/003-mosaic-candidates/contracts/pipeline-api.md` | ✅ Complete |
| UI state contract | `specs/003-mosaic-candidates/contracts/ui-state.md` | ✅ Complete |
| Quickstart | `specs/003-mosaic-candidates/quickstart.md` | ✅ Complete |
| Tasks | `specs/003-mosaic-candidates/tasks.md` | ⏳ Next (`/speckit-tasks`) |
