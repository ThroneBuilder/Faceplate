# Data Model: Phase 004 — Face Shaping

## New Types

### FaceMask

Represents the per-row horizontal visibility boundaries for a mosaic. A cell at `(row, col)` is **visible** if `leftCol ≤ col ≤ rightCol`; otherwise it is **masked** (dimmed in editor, absent in cubby projection).

```typescript
export interface FaceMaskRow {
  leftCol: number   // first visible column (0-indexed, inclusive); 0 = no left mask
  rightCol: number  // last visible column (0-indexed, inclusive); width-1 = no right mask
}

export interface FaceMask {
  rows: FaceMaskRow[]  // length === mosaic.height; index i corresponds to mosaic row i
  mosaicWidth: number  // copied from mosaic.width for bounds-checking
}
```

**Invariant**: `0 ≤ leftCol ≤ rightCol < mosaicWidth` for every row. If `leftCol > rightCol`, the row is fully masked (allowed — represents an edge case where the face is very narrow).

---

### AppState extension: `face-shaping`

Added to the `AppState` union immediately after `mosaic-confirmed`:

```typescript
| {
    phase: 'face-shaping'
    crop: HeadCropSelection      // carried from mosaic-confirmed
    mosaic: Mosaic               // the confirmed mosaic
    mask: FaceMask               // current per-row mask state
    key: CandidateKey            // brightness/contrast of confirmed candidate
  }
```

**Transition**: `mosaic-confirmed` → `face-shaping` via `onFaceShapingStart(state)`.

---

### PlateRegion (constants, not a runtime type)

The pixel coordinates of the white 16×16 plate within `Cubby.JPEG` (native resolution 1682 × 1457). Defined as module-level constants in `src/lib/face-shaping/cubby-render.ts`:

```typescript
// Calibrated against Cubby.JPEG at 1682×1457 px — verify visually during implementation
export const PLATE_X = 671   // left edge
export const PLATE_Y = 585   // top edge
export const PLATE_W = 340   // width in pixels
export const PLATE_H = 350   // height in pixels
export const CUBBY_W = 1682  // native image width (used for display scaling)
export const CUBBY_H = 1457  // native image height
```

---

## Existing Types — No Breaking Changes

| Type | Change |
|---|---|
| `Mosaic` | No change. The `mask` field (`boolean[][] \| null`) already exists and remains unused by this feature (face shaping uses `FaceMask` separately). |
| `HeadCropSelection` | No change. `headBounds` are NOT added in this phase (see research.md Decision 2). |
| `AppState` | Extended with `face-shaping` variant. `mosaic-confirmed` is unchanged. |

---

## State Transition Table

| From | Event | To | Notes |
|---|---|---|---|
| `mosaic-confirmed` | Confirm Mosaic button click | `face-shaping` | `onFaceShapingStart` computes initial ellipse mask |
| `face-shaping` | Click cell `(row, col)` | `face-shaping` | `onMaskCellClicked` updates one row in FaceMask |

Both transitions are pure functions (no side effects, no workers).

---

## Mask Initialisation Formula

For a mosaic of `width W` and `height H`:

```
cx = W / 2
cy = H / 2
semiX = W * 0.40       // horizontal semi-axis (40% of width per side)
semiY = H * 0.48       // vertical semi-axis   (48% of height per side)

for row r in 0..H-1:
  dy = (r + 0.5) - cy
  ratio = (dy / semiY)²
  if ratio >= 1.0:
    // row outside ellipse → fully masked
    leftCol[r]  = W          // leftCol > rightCol signals full mask
    rightCol[r] = -1
  else:
    rx = semiX * sqrt(1 - ratio)
    leftCol[r]  = max(0,   floor(cx - rx))
    rightCol[r] = min(W-1, ceil (cx + rx))
```

---

## Click-Toggle Formula

For a click at `(row, col)` in a mosaic of width `W`:

```
distLeft  = col + 1
distRight = W - col
edge = (distLeft <= distRight) ? 'left' : 'right'

if edge === 'left':
  isMasked = (col < mask.rows[row].leftCol)
  new leftCol = isMasked ? col : col + 1      // retract or extend

if edge === 'right':
  isMasked = (col > mask.rows[row].rightCol)
  new rightCol = isMasked ? col : col - 1     // retract or extend
```
