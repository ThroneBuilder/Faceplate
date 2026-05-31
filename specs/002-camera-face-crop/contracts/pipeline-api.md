# Contract: Updated Pipeline API

**Module**: `src/lib/mosaic/pipeline.ts` (updated), plus new modules
**Phase**: 1B/1C-pre

---

## Updated: `generateMosaic`

The `height` option now accepts `BrickHeight` rather than only `32`. Behavior is otherwise identical to Phase 1A.

```typescript
import type { Mosaic, LegoColor, MosaicOptions, BrickHeight } from '@/types'

// MosaicOptions.height is now BrickHeight, not 32
function generateMosaic(
  imageData: ImageData,
  palette: LegoColor[],
  options?: MosaicOptions
): Mosaic
```

**Updated invariants**:
- `result.grid.length === options?.height ?? 32` (was always 32)
- `result.height` is the `BrickHeight` passed in options (default `32`)
- Determinism unchanged: same `imageData` + same `palette` + same `options` → identical output

---

## New: `src/lib/image/exif.ts`

```typescript
export async function getOrientedImageData(file: File): Promise<ImageData>
```

Reads the EXIF `Orientation` tag and returns pixel data rotated to the correct upright orientation. Uses `exifr` lite build + `OffscreenCanvas`.

**Invariants**:
- Output is always an upright image regardless of EXIF tag value
- If `Orientation` tag is absent (PNG, screenshot), returns pixel data unchanged
- Output `width` and `height` may be swapped vs. input for orientations 5–8 (90°/270° rotation)
- Deterministic: same `File` → same output `ImageData` on every call

---

## New: `src/lib/image/head-detection.ts`

```typescript
import type { HeadBounds } from '@/types'

export async function initHeadDetector(): Promise<void>
// Loads face_landmarker.task from /models/; must be called once before detect().
// Resolves when model is ready. Rejects if model file cannot be fetched.

export function detectHeadBounds(imageData: ImageData): HeadBounds
// Synchronous after initHeadDetector() resolves.
// Returns HeadBounds with detectionStatus 'found', 'not-found', or 'too-small'.
```

**Invariants**:
- `detectHeadBounds` MUST NOT be called before `initHeadDetector` resolves
- Deterministic: same `imageData` → same `HeadBounds` on every call, every browser (WASM backend)
- If no face detected: returns `{ topY: 0, bottomY: imageData.height, detectionStatus: 'not-found' }`
- If detected height < 150px in source image: `detectionStatus: 'too-small'`, handles set to full image

---

## New: `src/lib/crop/head-crop.ts`

```typescript
import type { CropGeometry, BrickHeight } from '@/types'

export function computeCropGeometry(
  topY: number,
  bottomY: number,
  imageWidth: number,
  brickHeight: BrickHeight
): CropGeometry
// Pure function. Computes leftX, rightX, cropWidthPx, cropHeightPx from
// the two free variables (topY, bottomY) and the aspect ratio (32:brickHeight).

export function clampHandles(
  topY: number,
  bottomY: number,
  imageHeight: number,
  minHeightPx?: number   // default: 100
): { topY: number; bottomY: number }
// Clamps handle positions so crop is within image bounds and >= minHeightPx tall.

export function scaleToBrickHeight(
  topY: number,
  bottomY: number,
  imageHeight: number,
  fromHeight: BrickHeight,
  toHeight: BrickHeight
): { topY: number; bottomY: number }
// Recomputes handle positions when brickHeight changes, keeping the head
// region centered within the new crop height ratio.
```

**Invariants**:
- `computeCropGeometry`: `leftX === (imageWidth − cropWidthPx) / 2` always
- `computeCropGeometry`: `cropWidthPx / cropHeightPx ≈ 32 / brickHeight`
- All functions are pure (no DOM, no async); fully testable in Vitest node environment
