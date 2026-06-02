# Pipeline API Contracts: Phase 004 — Face Shaping

## Module: `src/lib/face-shaping/mask.ts`

Pure functions; no DOM, no side effects. Fully testable in Vitest node environment.

```typescript
import type { FaceMask } from '../../types/index.js'

/**
 * Builds the initial ellipse-based face mask for a mosaic of given dimensions.
 * Semi-axes: horizontal = width*0.40, vertical = height*0.48.
 * Rows outside the ellipse are fully masked (leftCol = width, rightCol = -1).
 */
export function buildInitialMask(mosaicWidth: number, mosaicHeight: number): FaceMask

/**
 * Toggles the mask at the clicked cell.
 * Determines nearest edge (left wins ties), then extends or retracts the
 * boundary for that row only.
 * Returns a new FaceMask (immutable update — does not mutate input).
 */
export function toggleMaskCell(mask: FaceMask, row: number, col: number): FaceMask

/**
 * Returns true if cell (row, col) is visible (not masked).
 */
export function isCellVisible(mask: FaceMask, row: number, col: number): boolean
```

### Behaviour contract

| Input | Expected output |
|---|---|
| `toggleMaskCell(mask, r, c)` where `c < mask.rows[r].leftCol` (masked, left edge nearer) | Returns mask with `rows[r].leftCol = c` (expose `c`) |
| `toggleMaskCell(mask, r, c)` where `c >= mask.rows[r].leftCol` (visible, left edge nearer) | Returns mask with `rows[r].leftCol = c + 1` (mask `c`) |
| `toggleMaskCell(mask, r, c)` where `c > mask.rows[r].rightCol` (masked, right edge nearer) | Returns mask with `rows[r].rightCol = c` (expose `c`) |
| `toggleMaskCell(mask, r, c)` where `c <= mask.rows[r].rightCol` (visible, right edge nearer) | Returns mask with `rows[r].rightCol = c - 1` (mask `c`) |
| Two consecutive calls with same `(row, col)` on an initially visible cell | First call masks; second call restores original state |

---

## Module: `src/lib/face-shaping/cubby-render.ts`

Canvas rendering; requires browser environment (not testable in Vitest node env).

```typescript
import type { Mosaic, FaceMask } from '../../types/index.js'
import type { LegoColor } from '../../types/index.js'

// Plate region constants (calibrate against Cubby.JPEG 1682×1457)
export const PLATE_X: number  // = 671 (initial estimate)
export const PLATE_Y: number  // = 585
export const PLATE_W: number  // = 340
export const PLATE_H: number  // = 350
export const CUBBY_W: number  // = 1682
export const CUBBY_H: number  // = 1457

/**
 * Renders the full cubby projection onto the given canvas.
 * Steps:
 *   1. Draw Cubby.JPEG scaled to canvas dimensions.
 *   2. Scale mosaic bricks to fill the plate region (aspect-correct, centred).
 *   3. Fill each visible cell with its brick colour.
 *   4. Draw shadow gradients at left/right face boundary edges.
 *
 * The canvas should be sized to match Cubby.JPEG aspect ratio; caller controls display size.
 * This function redraws from scratch each call (no partial updates).
 */
export function renderCubbyProjection(
  ctx: CanvasRenderingContext2D,
  cubbyImage: HTMLImageElement,
  mosaic: Mosaic,
  mask: FaceMask,
  palette: LegoColor[],
): void

/**
 * Pre-loads Cubby.JPEG from /images/Cubby.JPEG.
 * Returns a promise resolving to the loaded HTMLImageElement.
 * Caller caches the result; this should be called once.
 */
export function loadCubbyImage(): Promise<HTMLImageElement>
```

### Shadow rendering contract

For each row `r` with `leftCol > 0` (left shadow needed):
- Draw gradient from `(offsetX + leftCol*brickPx, offsetY + r*brickPxH)` extending `3*brickPxW` to the left
- Gradient: `rgba(0,0,0,0.35)` at face edge → `rgba(0,0,0,0)` outward

For each row `r` with `rightCol < mosaicWidth-1` (right shadow needed):
- Draw gradient extending `3*brickPxW` to the right from `rightCol`

---

## Module: `src/lib/face-shaping/mask.ts` — Unit test surface

Tests live in `tests/unit/face-mask.test.ts` (Vitest node env):

| Test | Description |
|---|---|
| `buildInitialMask` center rows fully visible | Center row of 32×32 mask should span full width |
| `buildInitialMask` corner rows masked | Row 0 and row 31 should be fully masked (outside ellipse) |
| `buildInitialMask` symmetry | `rows[r].leftCol` mirrors `width - 1 - rows[r].rightCol` (within ±1 due to rounding) |
| `toggleMaskCell` visible → masked | Clicking visible cell near left edge sets `leftCol = col + 1` |
| `toggleMaskCell` masked → visible | Clicking masked cell near left edge sets `leftCol = col` |
| `toggleMaskCell` right edge | Clicking visible cell near right edge sets `rightCol = col - 1` |
| `toggleMaskCell` double-toggle | Two clicks at same cell returns to original state |
| `toggleMaskCell` tiebreak | `col = width/2` (equidistant) → left edge chosen |
| `isCellVisible` boundary | Cell at `leftCol` is visible; cell at `leftCol-1` is masked |
