# Contract: UI State — Phase 2A/2B Candidate Grid

**Branch**: `003-mosaic-candidates` | **Date**: 2026-05-31

---

## AppState Phase Transitions

```
head-cropping
    │
    │ onCropConfirmed(crop: HeadCropSelection)
    ▼
candidate-grid ──────────────────────────────────────────────────────────────┐
    │  (cells generate progressively via Web Workers)                         │
    │                                                                          │
    │ onGridCellSelected(cellIndex: 0–8)                                      │ onHistoryEntryClicked(historyIndex)
    │   → pushHistory; buildNextGrid; abort prior batch; spawn new batch      │   → revertHistory; abort prior batch;
    │                                                                          │     hydrateFromCache (instant)
    ├──────────────────────────────────────────────────────────────────────────┘
    │
    │ onConfirmMosaic()
    ▼
mosaic-confirmed
```

---

## State Functions (`src/lib/app-state.ts` additions)

### `onCropConfirmed`

Transitions from `head-cropping` to `candidate-grid`. Immediately initialises the grid with all cells pending; caller is responsible for kicking off the first worker batch.

```typescript
function onCropConfirmed(
  state: { phase: 'head-cropping'; crop: HeadCropSelection },
): Extract<AppState, { phase: 'candidate-grid' }>
```

Returns a `candidate-grid` state with:
- `grid`: `buildInitialGrid()` (center=(0,0), step=67, all cells pending)
- `history`: `createHistory({ brightnessOffset: 0, contrastOffset: 0 }, 67)`
- `cache`: new empty `Map<string, Mosaic>`
- `generationAbortController`: undefined (caller sets it)

---

### `onCandidateCellSelected`

The user clicks a non-center cell. If the cell is not yet `ready`, this is a no-op (caller should not expose click handler on pending/error cells).

```typescript
function onCandidateCellSelected(
  state: Extract<AppState, { phase: 'candidate-grid' }>,
  cellIndex: number,                    // 0–8; index 4 = center (no-op)
): Extract<AppState, { phase: 'candidate-grid' }>
```

**Precondition**: `state.grid.cells[cellIndex].status === 'ready'`

**Returns** new state with:
- `history`: `pushHistory(state.history, selectedKey, state.grid.stepSize)`
- `grid`: `buildNextGrid(selectedKey, state.grid.stepSize)` then `hydrateGridFromCache(newGrid, cache)`
- `cache`: unchanged
- `generationAbortController`: new `AbortController` (old one has been aborted by caller)

---

### `onHistoryEntryClicked`

The user clicks a history strip entry (any index, including forward de-emphasised entries).

```typescript
function onHistoryEntryClicked(
  state: Extract<AppState, { phase: 'candidate-grid' }>,
  historyIndex: number,
): Extract<AppState, { phase: 'candidate-grid' }>
```

**Returns** new state with:
- `history`: `revertHistory(state.history, historyIndex)`
- `grid`: new `CandidateGrid` centered on `state.history.entries[historyIndex].key` with `stepSize = state.history.entries[historyIndex].stepSize`, all cells hydrated from cache (all should be present; reverted candidates were previously generated)
- `cache`: unchanged
- `generationAbortController`: new `AbortController` (caller aborts in-progress batch before calling this)

**Post-condition**: Grid is fully hydrated from cache; no new workers needed.

---

### `onWorkerCellReady`

Called by `spawnCandidateBatch`'s `onCellReady` callback. Updates a single cell in the grid.

```typescript
function onWorkerCellReady(
  state: Extract<AppState, { phase: 'candidate-grid' }>,
  cellIndex: number,
  mosaic: Mosaic,
): Extract<AppState, { phase: 'candidate-grid' }>
```

**Side effect** (managed outside this function): `putCached(state.cache, state.grid.cells[cellIndex].key, mosaic)`.

---

### `onWorkerCellError`

```typescript
function onWorkerCellError(
  state: Extract<AppState, { phase: 'candidate-grid' }>,
  cellIndex: number,
  errorMessage: string,
): Extract<AppState, { phase: 'candidate-grid' }>
```

---

### `onConfirmMosaic`

User clicks the Confirm Mosaic button. Uses the most-recent active history entry.

```typescript
function onConfirmMosaic(
  state: Extract<AppState, { phase: 'candidate-grid' }>,
): Extract<AppState, { phase: 'mosaic-confirmed' }>
```

**Precondition**: `activeEntry(state.history)` has a corresponding `ready` cell in `state.grid.cells[4]`.

---

## UI Rendering Rules

| Condition | Grid cell appearance |
|-----------|---------------------|
| `status === 'pending'` | Loading spinner; not clickable |
| `status === 'ready'`, non-center | Mosaic thumbnail; clickable |
| `status === 'ready'`, center (index 4) | Mosaic thumbnail + blue outline; not clickable (already selected) |
| `status === 'error'` | Grey placeholder + retry icon; not re-generated automatically |

| Condition | History strip appearance |
|-----------|--------------------------|
| `index === activeIndex` | Blue outline; visually prominent |
| `index < activeIndex` | Normal; clickable (revert available) |
| `index > activeIndex` | De-emphasised (dimmed/greyed); clickable (re-select available) |

| Condition | Confirm Mosaic button |
|-----------|----------------------|
| Always visible | Blue outline; enabled when `grid.cells[4].status === 'ready'` |
| `grid.cells[4].status === 'pending'` | Disabled; grey outline |

| Condition | Instructional text above grid |
|-----------|-------------------------------|
| `grid.atMinimumStep === false` | "Click a candidate to refine your selection" |
| `grid.atMinimumStep === true` | "Maximum refinement reached — click Confirm Mosaic to continue" |

---

## Blue Highlight Connection

The three elements share a consistent blue visual treatment to communicate they represent the same current choice:

1. `grid.cells[4]` (center cell) — blue outline
2. `history.entries[history.activeIndex]` — blue outline in history strip
3. Confirm Mosaic button — blue outline / primary button style

These MUST use the same colour token so they are visually linked without needing a literal drawn line.
