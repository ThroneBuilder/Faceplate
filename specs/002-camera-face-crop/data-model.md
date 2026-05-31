# Data Model: Phase 1B/1C-pre — Camera Capture and Seeded Manual Head-Height Crop

**Branch**: `002-camera-face-crop` | **Phase**: 1 (Design) | **Date**: 2026-05-31

All types extend `src/types/index.ts`. Changes to existing Phase 1A types are noted explicitly.

---

## New Type: BrickHeight

```typescript
export type BrickHeight = 26 | 28 | 30 | 32 | 34 | 36
```

Used wherever the mosaic height dimension is specified. The default is always `32`.

---

## New Entity: CameraSession

Active device camera feed initiated by the user. Lives only in memory during the camera-viewfinder and camera-preview phases.

```typescript
export interface CameraSession {
  stream: MediaStream                   // active getUserMedia stream
  activeDeviceId: string                // currently selected camera device ID
  availableDevices: MediaDeviceInfo[]   // all enumerated video input devices
  permissionState: 'granted' | 'denied' | 'prompt'

  // Phase 3 extension (multi-camera UX improvements)
  preferredFacing?: 'user' | 'environment'
}
```

**Invariant**: `stream` is active (not ended) while phase is `camera-viewfinder` or `camera-preview`. Stream MUST be stopped when leaving these phases.

---

## New Entity: HeadBounds

Result of running MediaPipe FaceLandmarker on an image. Produced once per image; drives the initial seeded handle positions.

```typescript
export interface HeadBounds {
  topY: number                                        // pixel Y of estimated skull crown
  bottomY: number                                     // pixel Y of chin tip (landmark 152)
  detectionStatus: 'found' | 'not-found' | 'too-small'
  // 'too-small': detected height < 150px (FR-017 fallback trigger)

  // Future: extensible for post-candidate masking phases
  landmarkData?: unknown                              // raw MediaPipe landmark payload
}
```

**Derivation**:
```
topY     = landmark[10].y − (0.10 × faceHeight)   // calibrated crown estimate
bottomY  = landmark[152].y
faceHeight = landmark[152].y − landmark[10].y
```

**Invariants**:
- `topY < bottomY` always.
- `detectionStatus === 'too-small'` if `bottomY − topY < 150` (in original image pixels).
- When `detectionStatus !== 'found'`, both `topY` and `bottomY` default to `0` and `imageHeight` respectively.

---

## New Entity: HeadCropSelection

The crop region after the user finalizes the seeded manual crop. Replaces `CropSelection` from Phase 1A.

```typescript
export interface HeadCropSelection {
  topY: number           // user-adjusted top handle Y (or seeded detection value)
  bottomY: number        // user-adjusted bottom handle Y (or seeded detection value)
  leftX: number          // auto-computed: (imageWidth − cropWidthPx) / 2
  rightX: number         // auto-computed: leftX + cropWidthPx
  cropWidthPx: number    // = round(cropHeightPx × 32 / brickHeight)
  cropHeightPx: number   // = bottomY − topY
  brickHeight: BrickHeight
  imageData: ImageData   // pixel data of the confirmed crop at (leftX, topY, cropWidthPx, cropHeightPx)
}
```

**Invariants**:
- `leftX === (imageWidth − cropWidthPx) / 2` (always centered horizontally).
- `cropWidthPx / cropHeightPx ≈ 32 / brickHeight` (exact within rounding).
- `brickHeight ∈ {26, 28, 30, 32, 34, 36}`.
- At `brickHeight = 32`, `cropWidthPx ≈ cropHeightPx` (square crop).
- `imageData.width === cropWidthPx`, `imageData.height === cropHeightPx`.

---

## Updated Entity: Mosaic

Updated to support variable height via `BrickHeight`. The `height` field is no longer fixed at `32`.

```typescript
export interface Mosaic {
  grid: number[][]         // [brickHeight][32] — rows vary by brickHeight
  width: 32                // always 32 brick columns
  height: BrickHeight      // 26 | 28 | 30 | 32 | 34 | 36 — was: always 32
  algorithmVersion: string
  pieceType?: '1x1-plate'
  mask?: boolean[][] | null
}
```

**Updated invariant**:
- `grid.length === height` (was always 32).
- `grid[i].length === 32` for all i (unchanged).
- `grid[i][j]` is a valid `LegoColor.id` (unchanged).

---

## Updated Entity: AdjustedImage

`source` now references `HeadCropSelection` instead of the Phase 1A `CropSelection`.

```typescript
export interface AdjustedImage {
  source: HeadCropSelection  // was: CropSelection
  brightnessOffset: number
  contrastOffset: number
  imageData: ImageData
}
```

---

## Updated Entity: PartsList

`totalPieces` is no longer always 1,024. It equals `32 × mosaic.height`.

```typescript
export interface PartsList {
  entries: PartsListEntry[]
  totalPieces: number  // = 32 × brickHeight (832–1152 before post-candidate masking)
}
```

---

## Updated Type: MosaicOptions

`height` field now accepts `BrickHeight` rather than only `32`.

```typescript
export interface MosaicOptions {
  width?: 32
  height?: BrickHeight   // was: height?: 32
  algorithmVersion?: string
}
```

---

## Updated AppState

Extended with new camera and crop phases. `CropSelection` usages replaced by `HeadCropSelection`.

```typescript
export type AppState =
  // ── Existing phases (unchanged) ─────────────────────────────────────────
  | { phase: 'idle' }
  | { phase: 'uploading' }
  | { phase: 'upload-error'; error: string }

  // ── New: camera capture phases (Phase 1B) ────────────────────────────────
  | { phase: 'camera-viewfinder'; session: CameraSession }
  | { phase: 'camera-preview'; photo: CapturedPhoto; session: CameraSession }
  | { phase: 'camera-error'; error: string }

  // ── New: pre-crop preparation phase ─────────────────────────────────────
  | { phase: 'preparing'; image: FaceImage }
  // covers: EXIF correction + MediaPipe head detection

  // ── Updated: head-crop replaces Phase 1A 'cropping' ─────────────────────
  | { phase: 'head-cropping'; image: FaceImage; headBounds: HeadBounds; brickHeight: BrickHeight }
  | { phase: 'head-crop-error'; image: FaceImage; headBounds: HeadBounds; error: string }

  // ── Existing phases (types updated) ─────────────────────────────────────
  | { phase: 'adjusting'; crop: HeadCropSelection; brightness: number; contrast: number }
  | { phase: 'generating'; adjusted: AdjustedImage }
  | { phase: 'result'; mosaic: Mosaic; adjusted: AdjustedImage; crop: HeadCropSelection }
```

---

## New Entity: CapturedPhoto

A still frame taken from the camera feed, before EXIF correction.

```typescript
export interface CapturedPhoto {
  blob: Blob               // raw photo data (JPEG from ImageCapture or canvas snapshot)
  widthPx: number          // natural width before EXIF correction
  heightPx: number
  capturedAt: number       // Date.now() at capture time
}
```

---

## Crop Geometry Helper Type

Used internally by the crop tool and exposed for testing.

```typescript
export interface CropGeometry {
  topY: number
  bottomY: number
  leftX: number        // = (imageWidth − cropWidthPx) / 2
  rightX: number       // = leftX + cropWidthPx
  cropWidthPx: number  // = round(cropHeightPx × 32 / brickHeight)
  cropHeightPx: number // = bottomY − topY
}
```

---

## Removed Entity

`CropSelection` (Phase 1A) is superseded by `HeadCropSelection`. The type is retained in `src/types/index.ts` as a deprecated alias for backward compatibility with any Phase 1A code paths that reference it, but all new code uses `HeadCropSelection`.
