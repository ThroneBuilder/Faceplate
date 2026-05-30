# Contract: Mosaic Pipeline API

**Module**: `src/lib/mosaic/pipeline.ts`
**Phase**: 1A

This is the core algorithmic contract. All browser-side mosaic generation flows through these functions. The contract is designed to be pure — no DOM access, no side effects — so the entire module is testable in a Node environment with the `canvas` npm package.

---

## `generateMosaic(imageData, palette, options?): Mosaic`

The primary entry point for Phase 1A mosaic generation.

```ts
import type { Mosaic, LegoColor } from '@/types'

interface MosaicOptions {
  width?: 32;        // Fixed at 32 for Phase 1A; extensible for future sizes
  height?: 32;
  algorithmVersion?: string;  // Defaults to package version
}

function generateMosaic(
  imageData: ImageData,         // Pixel data of the adjusted, cropped image
  palette: LegoColor[],         // Loaded LEGO color palette
  options?: MosaicOptions
): Mosaic
```

**Invariants**:
- Same `imageData` pixels + same `palette` → identical `Mosaic.grid` on every call (deterministic, FR-007)
- `result.grid.length === 32` and `result.grid[i].length === 32` for all i
- Every `result.grid[i][j]` is a `LegoColor.id` present in `palette`
- Throws if `palette` is empty

**Algorithm steps** (internal, not part of public contract):
1. Average-pool `imageData` into 32×32 super-pixels
2. For each super-pixel, find nearest `LegoColor` by CIEDE2000 via `culori.nearest`
3. Return `Mosaic` with the resulting grid

---

## `downsampleToGrid(imageData, gridW, gridH): RgbGrid`

Produces the 32×32 array of averaged RGB values. Exposed for unit testing.

```ts
type RgbGrid = Array<Array<[number, number, number]>>  // [gridH][gridW] of [R,G,B]

function downsampleToGrid(
  imageData: ImageData,
  gridW: number,
  gridH: number
): RgbGrid
```

**Invariants**:
- `result.length === gridH`
- `result[i].length === gridW` for all i
- Each RGB component is in [0, 255] (clamped)
- Deterministic for identical `imageData`

---

## `matchColors(grid, palette): number[][]`

Maps each cell of an `RgbGrid` to the nearest palette color ID.

```ts
function matchColors(
  grid: RgbGrid,
  palette: LegoColor[]
): number[][]  // Same dimensions as grid; values are LegoColor.id
```

**Invariants**:
- Output dimensions match input `grid` dimensions
- Every output value is a valid `LegoColor.id` in `palette`
- Deterministic for identical inputs

---

## `derivePartsList(mosaic, palette): PartsList`

Aggregates the mosaic grid into a parts list. Pure function.

```ts
import type { PartsList } from '@/types'

function derivePartsList(mosaic: Mosaic, palette: LegoColor[]): PartsList
```

**Invariants**:
- `result.totalPieces === 1024`
- `result.entries.reduce((s, e) => s + e.count, 0) === 1024`
- No duplicate `colorId` values
- `result.entries` sorted descending by `count`

---

## `applyAdjustments(imageData, brightness, contrast): ImageData`

**Module**: `src/lib/image/adjust.ts`

Applies brightness and contrast offsets to an `ImageData`. Pure function — returns a new `ImageData`.

```ts
function applyAdjustments(
  imageData: ImageData,
  brightnessOffset: number,   // −128 to +128
  contrastOffset: number      // −128 to +128
): ImageData
```

**Invariants**:
- Output has identical dimensions as input
- At `(0, 0)` offsets, output is pixel-identical to input
- All output pixel values are in [0, 255] (clamped)
- Alpha channel is preserved unchanged
- Deterministic for identical inputs

---

## Error Contract

All pipeline functions throw `PipelineError` (a typed subclass of `Error`) on invalid inputs:

```ts
class PipelineError extends Error {
  code: 'EMPTY_PALETTE' | 'INVALID_IMAGE_DATA' | 'INVALID_ADJUSTMENT_RANGE'
}
```

No other error types are thrown from pipeline modules. DOM errors (canvas context failures) bubble up as native browser errors and are handled at the UI layer.
