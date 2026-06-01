# Quickstart: Phase 1B/1C-pre — Camera Capture and Seeded Manual Head-Height Crop

**Branch**: `002-camera-face-crop` | **Date**: 2026-05-31

---

## Prerequisites

Same as Phase 1A: Node.js 20+, pnpm 9+. Phase 1A must be fully implemented first.

---

## Dependency Changes

```bash
# Add new runtime dependencies
pnpm add @mediapipe/tasks-vision exifr

# Remove cropperjs (superseded by custom crop tool)
pnpm remove cropperjs
# (also remove @types/cropperjs if installed)
```

**Verify `@mediapipe/tasks-vision`** imports correctly — it is an ESM package. If Vitest has issues (same problem as culori in Phase 1A), mock the module in tests rather than importing it in the Node environment.

---

## MediaPipe Model Setup

```bash
mkdir -p public/models

# Download the FaceLandmarker task model (~4 MB)
# Source: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
# Place at: public/models/face_landmarker.task
```

Add to `.gitignore` (optional — model can be committed or fetched in CI):
```gitignore
# If not committing the model file:
# public/models/face_landmarker.task
```

---

## Updated Project Structure

```
src/
├── components/
│   ├── CameraViewfinder.astro    (NEW) live camera feed + capture button
│   ├── CameraPreview.astro       (NEW) captured photo preview + confirm/retake
│   ├── HeadCropTool.astro        (NEW) seeded manual crop with brick height selector
│   ├── UploadArea.astro          (UPDATED) camera option added above upload
│   ├── AdjustmentPanel.astro     (unchanged)
│   ├── MosaicDisplay.astro       (unchanged)
│   ├── ColorMatrix.astro         (unchanged)
│   └── PartsList.astro           (UPDATED) totalPieces reflects variable height)
├── lib/
│   ├── app-state.ts              (UPDATED) new phases + transitions
│   ├── image/
│   │   ├── exif.ts               (NEW) EXIF orientation correction
│   │   ├── head-detection.ts     (NEW) MediaPipe FaceLandmarker wrapper
│   │   ├── validate.ts           (unchanged)
│   │   └── adjust.ts             (unchanged)
│   ├── crop/
│   │   └── head-crop.ts          (NEW) crop geometry calculations
│   └── mosaic/
│       ├── pipeline.ts           (UPDATED) height: BrickHeight option
│       ├── downsample.ts         (unchanged — already accepts gridW/gridH)
│       ├── color-match.ts        (unchanged)
│       └── parts-list.ts         (UPDATED) totalPieces = 32 × height)
├── types/
│   └── index.ts                  (UPDATED) BrickHeight, HeadBounds, HeadCropSelection, etc.
└── pages/
    └── index.astro               (UPDATED) new state phases wired

public/
└── models/
    └── face_landmarker.task      (NEW, ~4 MB)

tests/
├── unit/
│   ├── exif.test.ts              (NEW)
│   ├── head-crop.test.ts         (NEW)
│   └── parts-list.test.ts        (UPDATED — test variable heights)
├── regression/
│   ├── mosaic-pipeline.test.ts   (UPDATED — test 32×28, 32×32, 32×36)
│   └── __snapshots__/
│       ├── mosaic-32x32.snap.json  (existing — must still pass)
│       ├── mosaic-32x28.snap.json  (NEW)
│       └── mosaic-32x36.snap.json  (NEW)
└── mocks/
    └── head-detection.mock.ts    (NEW) Vitest mock for @mediapipe/tasks-vision
```

---

## Testing Strategy

### Mocking MediaPipe in Tests

`@mediapipe/tasks-vision` is an ESM package that may have the same Vitest/Node ESM issue as culori (Phase 1A). Do not import it in the Node test environment directly. Instead:

```typescript
// tests/mocks/head-detection.mock.ts
import { vi } from 'vitest'

vi.mock('../../src/lib/image/head-detection.js', () => ({
  initHeadDetector: vi.fn().mockResolvedValue(undefined),
  detectHeadBounds: vi.fn().mockReturnValue({
    topY: 40, bottomY: 200, detectionStatus: 'found'
  })
}))
```

### `head-crop.ts` Tests

`head-crop.ts` is pure math — no DOM, no async, no MediaPipe. Test directly:

```typescript
import { computeCropGeometry, clampHandles, scaleToBrickHeight } from '../../src/lib/crop/head-crop.js'

// computeCropGeometry: verify leftX centering, aspect ratio, rounding
// clampHandles: verify boundary clamping
// scaleToBrickHeight: verify handle scaling when brickHeight changes
```

### EXIF Tests

`exif.ts` uses `createImageBitmap` and `OffscreenCanvas` (browser APIs). In Vitest node environment, mock these or test via manual integration in the browser. Unit tests for EXIF can test the transform table (orientation 1–8) with small synthetic ImageData.

---

## Implementation Order

1. `src/types/index.ts` — add `BrickHeight`, `HeadBounds`, `HeadCropSelection`, `CapturedPhoto`, `CameraSession`, update `Mosaic`, `AdjustedImage`, `AppState`
2. `src/lib/mosaic/pipeline.ts` — update height option to `BrickHeight`
3. `src/lib/mosaic/parts-list.ts` — update totalPieces = 32 × height
4. `src/lib/crop/head-crop.ts` + tests
5. `src/lib/image/exif.ts` + tests (mock or integration)
6. `src/lib/image/head-detection.ts` + mock setup
7. `src/lib/app-state.ts` — new camera + crop phases
8. `src/components/CameraViewfinder.astro`
9. `src/components/CameraPreview.astro`
10. `src/components/HeadCropTool.astro` — custom top/bottom handle crop UI + brick height selector
11. `src/components/UploadArea.astro` — add camera option above upload
12. `src/pages/index.astro` — wire all new state phases
13. Update regression snapshots: `pnpm run test:update`
14. `public/models/face_landmarker.task` — download and place model file
