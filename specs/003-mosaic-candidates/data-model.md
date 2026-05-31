# Data Model: Phase 2A/2B — Mosaic Candidate Grid and Iterative Selection

**Branch**: `003-mosaic-candidates` | **Date**: 2026-05-31

---

## New Types

All new types live in `src/types/index.ts` alongside existing types.

```typescript
// ─── Candidate key (unique position in B×C space) ─────────────────────────────
export interface CandidateKey {
  brightnessOffset: number  // integer, −100 to 100
  contrastOffset: number    // integer, −100 to 100
}

// ─── Single generated mosaic candidate ────────────────────────────────────────
export interface MosaicCandidate {
  key: CandidateKey
  status: 'pending' | 'ready' | 'error'
  mosaic?: Mosaic            // present when status === 'ready'
  errorMessage?: string      // present when status === 'error'
}

// ─── 3×3 grid of candidates ───────────────────────────────────────────────────
export interface CandidateGrid {
  center: CandidateKey       // (b, c) of the chosen candidate at grid center
  stepSize: number           // current ± step; next = max(floor(stepSize / 2), 1)
  cells: [                   // row-major order: [top-left, ..., bottom-right]
    MosaicCandidate, MosaicCandidate, MosaicCandidate,
    MosaicCandidate, MosaicCandidate, MosaicCandidate,
    MosaicCandidate, MosaicCandidate, MosaicCandidate,
  ]
  atMinimumStep: boolean     // true when stepSize === 1 (all surrounding cells identical to center)
}

// ─── One entry in the user's selection history ────────────────────────────────
export interface HistoryEntry {
  key: CandidateKey
  stepSize: number           // step that was active when this was chosen
  chosenAt: number           // Date.now() timestamp
}

// ─── Ordered history of user choices ──────────────────────────────────────────
export interface SelectionHistory {
  entries: HistoryEntry[]    // index 0 = initial default (0,0); index n = most recent
  activeIndex: number        // which entry is the current active choice
                             // activeIndex < entries.length - 1 means user has reverted
}

// ─── Cache of computed mosaics keyed by "b:c" ────────────────────────────────
export type CandidateCache = Map<string, Mosaic>

// ─── Helper: canonical cache key ─────────────────────────────────────────────
// export function candidateCacheKey(key: CandidateKey): string {
//   return `${key.brightnessOffset}:${key.contrastOffset}`
// }
// (implemented in src/lib/candidates/cache.ts, listed here for reference)
```

---

## AppState Extension

The `adjusting` and `generating` phases from Phase 1A are superseded by `candidate-grid`. The old `adjusting` phase (manual brightness/contrast slider) is no longer part of the happy-path flow; candidate-grid replaces it.

```typescript
// Add to AppState union in src/types/index.ts:

| {
    phase: 'candidate-grid'
    crop: HeadCropSelection            // the confirmed crop (fixed for all candidates)
    grid: CandidateGrid                // current 3×3 display
    history: SelectionHistory          // user's choice history
    cache: CandidateCache              // keyed by "b:c"
    generationAbortController?: AbortController  // cancels in-progress worker batch
  }

| {
    phase: 'mosaic-confirmed'
    crop: HeadCropSelection
    mosaic: Mosaic                     // the user's final choice
    key: CandidateKey                  // (b, c) of the confirmed choice
  }
```

**Phase transition**:
- `head-cropping` → (user clicks Confirm Crop) → `candidate-grid` (initial grid, center=(0,0), step=67)
- `candidate-grid` → (user clicks Confirm Mosaic) → `mosaic-confirmed`

The existing `{ phase: 'adjusting' }` and `{ phase: 'generating' }` union members are retained in `AppState` temporarily to avoid breaking existing Phase 1A code paths, but marked `@deprecated`.

---

## MosaicOptions Extension

Add `brightnessOffset` and `contrastOffset` to `MosaicOptions` so the pipeline can apply them internally (used by workers):

```typescript
export interface MosaicOptions {
  width?: 32
  height?: BrickHeight
  algorithmVersion?: string
  brightnessOffset?: number   // integer, −100 to 100; default 0
  contrastOffset?: number     // integer, −100 to 100; default 0
}
```

---

## Relationships

```
HeadCropSelection  ──────────────────────────────────────────────┐
                                                                  │ (fixed for session)
CandidateGrid ─── center: CandidateKey                          │
             ─── cells[9]: MosaicCandidate ─── key: CandidateKey │
                                         └─── mosaic: Mosaic ◄──┘

SelectionHistory ─── entries[]: HistoryEntry ─── key: CandidateKey
                 ─── activeIndex: number

CandidateCache (Map<"b:c", Mosaic>) ──── keyed subset of all generated Mosaics
```

---

## State Transitions for CandidateGrid.cells

```
Initial:           all cells status='pending'
Worker completes:  cells[i].status = 'ready'; cells[i].mosaic = result
Worker errors:     cells[i].status = 'error'; cells[i].errorMessage = msg
User clicks cell:  build new CandidateGrid centered on cells[i].key;
                   stepSize = max(floor(currentStep / 2), 1);
                   all new cells status='pending'; cache retained
History click:     same as click, but use history entry's key + stepSize;
                   cancel generationAbortController; served instantly from cache
```

---

## Validation Rules

| Field | Rule |
|-------|------|
| `CandidateKey.brightnessOffset` | Integer, clamped to [−100, 100] |
| `CandidateKey.contrastOffset` | Integer, clamped to [−100, 100] |
| `CandidateGrid.stepSize` | Integer ≥ 1 |
| `CandidateGrid.cells` | Exactly 9 elements; index 4 (center) always matches `grid.center` |
| `SelectionHistory.activeIndex` | 0 ≤ activeIndex < entries.length |
| `HistoryEntry.stepSize` | stepSize that was active when the entry was created |
