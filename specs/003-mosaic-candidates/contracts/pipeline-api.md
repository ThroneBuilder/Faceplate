# Contract: Pipeline API — Phase 2A/2B Candidate Generation

**Branch**: `003-mosaic-candidates` | **Date**: 2026-05-31

All functions are pure (no side effects) unless noted. All live under `src/lib/candidates/`.

---

## Module: `src/lib/candidates/grid.ts`

### `computeGridKeys`

Computes the 9 `CandidateKey` positions for a 3×3 grid centered at `center` with the given `stepSize`. Returns keys in row-major order (top-left to bottom-right); index 4 is always the center.

```typescript
function computeGridKeys(
  center: CandidateKey,
  stepSize: number,
): [
  CandidateKey, CandidateKey, CandidateKey,
  CandidateKey, CandidateKey, CandidateKey,
  CandidateKey, CandidateKey, CandidateKey,
]
```

**Constraints**:
- Each surrounding key is `center ± stepSize` in both axes independently (all 9 combinations of {-step, 0, +step} × {-step, 0, +step}).
- All values clamped to [−100, 100] after computation.
- `CandidateKey` at index 4 equals `center` exactly.

**Example** (center=(0,0), step=67):
```
(-67,-67) (0,-67) (67,-67)
(-67,  0) (0,  0) (67,  0)
(-67, 67) (0, 67) (67, 67)
```

---

### `computeNextStep`

Halves the step size, floored to a minimum of 1.

```typescript
function computeNextStep(currentStep: number): number
// computeNextStep(67) → 33
// computeNextStep(33) → 16
// computeNextStep(1)  → 1
```

---

### `buildInitialGrid`

Builds the opening `CandidateGrid` (center=(0,0), step=67, all cells pending).

```typescript
function buildInitialGrid(): CandidateGrid
```

---

### `buildNextGrid`

Builds the next `CandidateGrid` after the user selects a candidate. The new center is `selectedKey`; `stepSize` = `computeNextStep(currentStep)`. Cells are initialised as `pending`; caller resolves them from cache before spawning workers.

```typescript
function buildNextGrid(
  selectedKey: CandidateKey,
  currentStep: number,
): CandidateGrid
```

---

## Module: `src/lib/candidates/cache.ts`

### `candidateCacheKey`

```typescript
function candidateCacheKey(key: CandidateKey): string
// candidateCacheKey({brightnessOffset: 67, contrastOffset: -33}) → "67:-33"
```

### `getCached`

```typescript
function getCached(cache: CandidateCache, key: CandidateKey): Mosaic | undefined
```

### `putCached`

```typescript
function putCached(cache: CandidateCache, key: CandidateKey, mosaic: Mosaic): void
```

### `hydrateGridFromCache`

Updates `cells` in-place for any keys found in `cache`. Returns the set of keys that were NOT in cache (need worker generation).

```typescript
function hydrateGridFromCache(
  grid: CandidateGrid,
  cache: CandidateCache,
): CandidateKey[]   // keys that still need generation
```

---

## Module: `src/lib/candidates/history.ts`

### `createHistory`

Creates the initial `SelectionHistory` with the default candidate (0,0).

```typescript
function createHistory(initialKey: CandidateKey, initialStep: number): SelectionHistory
```

### `pushHistory`

Adds a new entry at `activeIndex + 1`. If `activeIndex < entries.length - 1` (user had reverted), all entries after `activeIndex` are discarded before appending.

```typescript
function pushHistory(
  history: SelectionHistory,
  key: CandidateKey,
  stepSize: number,
): SelectionHistory
```

### `revertHistory`

Sets `activeIndex` to `targetIndex`. Does NOT truncate forward entries (they remain de-emphasised).

```typescript
function revertHistory(
  history: SelectionHistory,
  targetIndex: number,
): SelectionHistory
```

### `activeEntry`

```typescript
function activeEntry(history: SelectionHistory): HistoryEntry
// returns history.entries[history.activeIndex]
```

---

## Module: `src/lib/candidates/worker-pool.ts`

### `spawnCandidateBatch`

Spawns Web Workers to generate all `missing` candidates. Resolves each cell in `grid.cells` as workers complete. Calls `onCellReady` after each completion. Returns a `Promise` that resolves when all workers finish or `signal` is aborted.

```typescript
function spawnCandidateBatch(options: {
  grid: CandidateGrid
  missing: CandidateKey[]
  cropImageData: ImageData      // source pixel data (never leaves browser)
  palette: LegoColor[]
  cache: CandidateCache
  onCellReady: (index: number, mosaic: Mosaic) => void
  onCellError: (index: number, error: string) => void
  signal: AbortSignal
}): Promise<void>
```

**Behaviour**:
- Spawns `min(missing.length, navigator.hardwareConcurrency)` workers.
- Each worker receives a structured-clone copy of `cropImageData.data.buffer` (never transferred; all workers need it).
- Workers use `src/lib/candidates/mosaic-worker.ts` entry point.
- When `signal` is aborted, terminates all pending workers immediately.

---

## Worker entry: `src/lib/candidates/mosaic-worker.ts`

Receives a `WorkerInput` message, generates the mosaic, posts a `WorkerOutput` message.

```typescript
interface WorkerInput {
  index: number
  imageBuffer: ArrayBuffer       // copy of cropImageData.data.buffer
  imageWidth: number
  imageHeight: number
  brightnessOffset: number
  contrastOffset: number
  palette: LegoColor[]
  height: BrickHeight
}

interface WorkerOutput {
  index: number
  mosaic?: Mosaic                // present on success
  error?: string                 // present on failure
}
```

**Processing**:
1. Reconstruct `ImageData` from buffer.
2. Apply brightness/contrast adjustment (reuse `applyAdjustment` from `src/lib/image/adjust.ts`).
3. Call `generateMosaic(adjustedImageData, palette, { height })`.
4. `postMessage({ index, mosaic })`.

---

## Invariants

- `CandidateGrid.cells[4].key` always equals `CandidateGrid.center`.
- `CandidateGrid.atMinimumStep` is true iff `stepSize === 1`.
- Once a `Mosaic` for a given `CandidateKey` is in `CandidateCache`, it is immutable and never re-generated.
- Clicking the history strip while a batch is in progress aborts the batch; the reverted-to mosaic is served from cache (<100ms).
