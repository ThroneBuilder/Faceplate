---
description: "Task list for Phase 1B/1C-pre — Camera Capture and Seeded Manual Head-Height Crop"
---

# Tasks: Phase 1B/1C-pre — Camera Capture and Seeded Manual Head-Height Crop

**Input**: Design documents from `specs/002-camera-face-crop/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Included — architecture constraints require regression testing; head detection must be regression-testable per FR-020 and Constitution Principle V.

**Phase 1A dependency**: All Phase 1A implementation must be complete before this phase begins.

---

## Phase 1: Setup

**Purpose**: Update dependencies and prepare model file.

- [ ] T001 Update `package.json`: add `"@mediapipe/tasks-vision": "^0.10.0"` and `"exifr": "^7.1.3"` to `dependencies`; remove `"cropperjs"` from `dependencies`
- [ ] T002 Run `pnpm install` to apply dependency changes
- [ ] T003 [MANUAL] Download MediaPipe model: fetch `face_landmarker.task` (~4 MB) from `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task` and place at `public/models/face_landmarker.task`
- [ ] T004 [P] Create `tests/mocks/head-detection.mock.ts`: export `vi.mock` stubs for `initHeadDetector` (resolves immediately) and `detectHeadBounds` (returns `{ topY: 40, bottomY: 200, detectionStatus: 'found' }`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Update shared types, pipeline, state machine, and test infrastructure that all user stories depend on.

- [ ] T005 Update `src/types/index.ts`: add `BrickHeight` (union `26 | 28 | 30 | 32 | 34 | 36`), `HeadBounds`, `HeadCropSelection`, `CapturedPhoto`, `CameraSession`, `CropGeometry`; update `Mosaic.height` from `32` to `BrickHeight`; update `AdjustedImage.source` from `CropSelection` to `HeadCropSelection`; update `MosaicOptions.height` to `BrickHeight`; update `AppState` with camera + head-crop phases per `data-model.md`; keep `CropSelection` as deprecated alias
- [ ] T006 [P] Update `src/lib/mosaic/pipeline.ts`: change `const GRID_SIZE = 32` height usage to `options?.height ?? 32` typed as `BrickHeight`; update returned `Mosaic.height` to the resolved `BrickHeight` value (depends on T005)
- [ ] T007 [P] Update `src/lib/mosaic/parts-list.ts`: remove `totalPieces === 1024` assertion; compute `totalPieces` as `entries.reduce((s, e) => s + e.count, 0)` (which equals `32 × mosaic.height` for any valid mosaic) (depends on T005)
- [ ] T008 [P] Update `src/lib/app-state.ts`: add all new camera transition functions (`onCameraRequested`, `onCameraSessionReady`, `onPhotoCaptured`, `onPhotoRetaken`, `onPhotoConfirmed`, `onCameraError`), preparation function (`onImagePrepared`), and head-crop functions (`onBrickHeightChanged`, `onHeadCropConfirmed`, `onResetToFullImage`) per `contracts/ui-state.md`; update existing transitions that reference `CropSelection` to use `HeadCropSelection` (depends on T005)
- [ ] T009 [P] Update `tests/unit/parts-list.test.ts`: replace the fixed `totalPieces === 1024` test with tests for `totalPieces === 32 × brickHeight` for brickHeights 26, 32, and 36; add test that `totalPieces` matches the sum of all entry counts (depends on T005, T007)
- [ ] T010 [P] Update `tests/regression/mosaic-pipeline.test.ts`: add four new tests using `makeRainbowGradient()` for heights 26, 28, 34, and 36 — each calling `generateMosaic(img, palette, { height: H })` with `toMatchFileSnapshot('__snapshots__/mosaic-32xH.snap.json')`; assert `mosaic.grid.length === H` and `mosaic.width === 32` for each; verify existing 32×32 test still passes (satisfies SC-006 coverage for all non-default heights) (depends on T005, T006)

**Checkpoint**: Foundational types and pipeline updated — user story implementation can now begin.

---

## Phase 3: User Story 1 — Capture a Photo with the Device Camera (Priority: P1) 🎯 MVP

**Goal**: User can open a live viewfinder, take a photo, confirm it, and have it enter the downstream head-crop flow — without touching file upload.

**Independent Test**: On a camera-equipped device, select "Use Camera," allow permission, see live feed, tap Capture, see preview, tap Confirm — and arrive at the head-height crop screen. Verify that denying camera permission shows an error and leaves file upload usable.

### Tests for User Story 1

> **Write tests FIRST — confirm they fail before implementing.**

- [ ] T011 [P] [US1] Write unit tests for camera permission handling in `tests/unit/camera.test.ts`: test `NotAllowedError` maps to `camera-error` state, `NotFoundError` hides camera option, successful `getUserMedia` transitions to `camera-viewfinder`; mock `navigator.mediaDevices`

### Implementation for User Story 1

- [ ] T012 [US1] Implement `src/components/CameraViewfinder.astro`: `<video>` element for live stream; Capture button (`<button id="capture-btn">`); "Switch Camera" button visible when `availableDevices.length > 1`; error message slot; emits `captureTaken` custom event with the captured `Blob` (depends on T008)
- [ ] T013 [P] [US1] Implement `src/components/CameraPreview.astro`: `<img id="preview-img">` for captured photo preview; "Confirm" and "Retake" buttons; emits `captureConfirmed` and `captureRetaken` custom events (depends on T005)
- [ ] T014 [US1] Update `src/components/UploadArea.astro`: add a "Use Camera" section above the existing file `<input>` — visible only when `navigator.mediaDevices?.getUserMedia` is available (feature-detected at runtime); when not available, section is absent with no empty space; add `<p id="camera-error">` error slot (depends on T008)
- [ ] T015 [US1] Wire US1 camera flow in `src/pages/index.astro`: remove `import Cropper from 'cropperjs'` and `import 'cropperjs/dist/cropper.css'`; remove the Phase 1A `initCropper()`, `destroyCropper()`, `cropConfirmBtn`, and `uploadResetBtn` event handler functions and listeners; handle `getUserMedia` call → `onCameraSessionReady`; handle `captureTaken` event → `onPhotoCaptured` → show `CameraPreview`; handle `captureConfirmed` → stop stream → create `File` from blob → `validateFile` → `onFileValidated` → transition to `preparing`; handle `captureRetaken` → `onPhotoRetaken` → resume viewfinder; handle `NotAllowedError`/`NotFoundError` → `onCameraError`; show/hide `CameraViewfinder`, `CameraPreview`, `CameraError` sections based on `AppState.phase` (depends on T008, T012, T013, T014)

**Checkpoint**: User Story 1 independently functional — camera → capture → confirm → preparing phase begins.

---

## Phase 4: User Story 2 — Seeded Manual Head-Height Crop (Priority: P2)

**Goal**: After obtaining any image, EXIF-correct it, detect skull top + chin bottom via MediaPipe, show a manual crop interface with pre-seeded handles and a brick height selector, and confirm the crop with the correct 32:H aspect ratio.

**Independent Test**: Upload a portrait JPEG taken in landscape orientation on a phone (has EXIF rotation). Verify the crop screen shows the image upright. Verify the handles are pre-positioned near the skull top and chin bottom. Select brick height 28, confirm the crop handles have adjusted, confirm the crop, and verify the mosaic generates at 32×28 with 896 total pieces.

### Tests for User Story 2

> **Write tests FIRST — confirm they fail before implementing.**

- [ ] T016 [P] [US2] Write unit tests for `src/lib/image/exif.ts` in `tests/unit/exif.test.ts`: create synthetic `ImageData` objects and verify that orientation corrections 1–8 produce the correct output dimensions and pixel arrangement; mock `createImageBitmap` and `OffscreenCanvas` as needed for Node environment
- [ ] T017 [P] [US2] Write unit tests for `src/lib/crop/head-crop.ts` in `tests/unit/head-crop.test.ts`: test `computeCropGeometry` — verify `leftX === (imageWidth - cropWidthPx) / 2`, verify aspect ratio `cropWidthPx / cropHeightPx ≈ 32 / brickHeight` for all 6 heights; test `clampHandles` — verify topY/bottomY never go out of image bounds; test `scaleToBrickHeight` — verify handles reposition to keep head centered

### Implementation for User Story 2

- [ ] T018 [US2] Implement `src/lib/image/exif.ts`: export `getOrientedImageData(file: File): Promise<ImageData>` — read EXIF `Orientation` tag with `exifr/dist/lite.esm.js`; decode with `createImageBitmap` (always returns unrotated pixels); apply the 8-orientation transform table with `OffscreenCanvas`; swap canvas dimensions for orientations 5–8; return upright `ImageData` (depends on T005)
- [ ] T019 [P] [US2] Implement `src/lib/crop/head-crop.ts`: export `computeCropGeometry(topY, bottomY, imageWidth, brickHeight): CropGeometry`; export `clampHandles(topY, bottomY, imageHeight, minHeightPx?): {topY, bottomY}`; export `scaleToBrickHeight(topY, bottomY, imageHeight, fromHeight, toHeight): {topY, bottomY}` — all pure functions, no DOM, per `contracts/pipeline-api.md` (depends on T005)
- [ ] T020 [US2] Implement `src/lib/image/head-detection.ts`: export `initHeadDetector(): Promise<void>` — wraps model fetch and `FaceLandmarker` initialization in a try/catch; on failure (model file missing or fetch error) log a warning and set a module-level `detectorUnavailable` flag so `detectHeadBounds` returns `{ topY: 0, bottomY: imageData.height, detectionStatus: 'not-found' }` without throwing (applies FR-017 fallback for model-load failures); on success initialize `FaceLandmarker` from `@mediapipe/tasks-vision` with WASM backend; export `detectHeadBounds(imageData: ImageData): HeadBounds` — if `detectorUnavailable` return fallback immediately; otherwise run inference; computes `topY = landmark[10].y - 0.10 × faceHeight`, `bottomY = landmark[152].y`; returns `detectionStatus: 'too-small'` if detected height < 150px, `detectionStatus: 'not-found'` if no face (depends on T005)
- [ ] T021 [US2] Implement `src/components/HeadCropTool.astro`: `<img>` of the source image with an absolutely-positioned overlay `<div>` containing two horizontal drag bars (top and bottom `<div>` elements); pointer-event drag handlers update `topY`/`bottomY` and recompute `leftX`/`rightX` via `computeCropGeometry`; brick height `<select>` with options 26/28/30/32/34/36 (default 32); on height change call `scaleToBrickHeight` and redraw overlay; "Confirm Crop" button; "Reset to full image height" button; "Head not detected" notice slot (depends on T018, T019)
- [ ] T022 [US2] Wire US2 preparing + head-crop flow in `src/pages/index.astro`: after `onFileValidated` or `onPhotoConfirmed` → show `#preparing-indicator` ("Preparing image…") → transition to `preparing` → call `getOrientedImageData` → call `initHeadDetector` (lazy, once) then `detectHeadBounds` → hide `#preparing-indicator` → call `onImagePrepared(headBounds)` → show `HeadCropTool` in `head-cropping` phase; remove Phase 1A `phase === 'cropping'` and `phase === 'crop-error'` branches from `renderPhase()`; handle brick height change → `onBrickHeightChanged`; handle `cropConfirmed` event → read `HeadCropSelection` → `onHeadCropConfirmed` → `adjusting`; handle reset → `onResetToFullImage`; apply FR-017 fallback: if `headBounds.detectionStatus !== 'found'`, show "Head not detected — handles set to full image" notice and proceed (depends on T008, T018, T019, T020, T021)

- [ ] T029 [US2] Add a `<div id="preparing-indicator">` loading indicator to `src/pages/index.astro` (or a new `src/components/PreparingIndicator.astro`): display spinner + "Preparing image…" text visible only when `AppState.phase === 'preparing'`; the T022 wiring hides it as soon as `onImagePrepared` fires (addresses U1 — ~500ms–2s frozen UI otherwise)

**Checkpoint**: User Story 2 independently functional — any image (uploaded or captured) flows through EXIF correction, head detection, seeded manual crop, and into the mosaic generator with the selected brick height.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, regression snapshots, stream teardown verification, cross-browser validation.

- [ ] T030 [P] Delete `src/components/CropTool.astro` (Phase 1A artifact, superseded by `HeadCropTool.astro`); confirm no remaining import of `CropTool` in `src/pages/index.astro` or any other file
- [ ] T023 [P] Update `src/components/PartsList.astro`: display `Total pieces: <strong id="total-pieces">0</strong>` where `totalPieces` reflects `32 × brickHeight` (range 832–1152); label no longer says "1,024 pieces"
- [ ] T024 [P] Verify camera stream teardown in `src/pages/index.astro`: confirm `stream.getTracks().forEach(t => t.stop())` is called on `onPhotoConfirmed`, `onCameraError`, and `onReset` transitions; add a teardown check that the camera indicator light is not left on after photo is confirmed
- [ ] T025 [P] Verify FR-009 (no camera option on unsupported devices): test `UploadArea.astro` in a browser with `navigator.mediaDevices = undefined`; confirm camera section is absent and layout has no empty space
- [ ] T026 Run full Vitest test suite: `pnpm test` — confirm all Phase 1A tests still pass, all new unit tests pass, no snapshot regressions
- [ ] T027 Run `pnpm run test:update` to seed new regression snapshots (`mosaic-32x28.snap.json` and `mosaic-32x36.snap.json`); commit the three snapshot files
- [ ] T028 Manual cross-browser validation: on a camera-equipped device test in Chrome and Safari — complete the full camera → head-crop → generate → view flow; verify camera permission prompt appears, handles seed near skull and chin, brick height selector changes crop aspect ratio visibly, mosaic generates correctly

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No code dependencies — start immediately
- **Foundational (Phase 2)**: Requires Phase 1 — **BLOCKS all user stories**
- **US1 (Phase 3)**: Requires Phase 2
- **US2 (Phase 4)**: Requires Phase 2 and US1 camera flow (US2 wires after `onFileValidated` or `onPhotoConfirmed`)
- **Polish (Phase 5)**: Requires all story phases complete

### User Story Dependencies

- **US1 (P1)**: Phase 2 only → independent. Camera flow ends at `preparing` phase which US2 picks up.
- **US2 (P2)**: Phase 2 + US1 (`onPhotoConfirmed` triggers the same `preparing` → `head-cropping` flow as file upload). US2 includes the head-crop step that BOTH camera and upload paths go through.

### Parallel Opportunities

```
Phase 1:   T001 → T002 → [T003 (manual), T004 [P]]
Phase 2:   T005 → [T006 [P], T007 [P], T008 [P], T009 [P], T010 [P]]
Phase 3:   T011 [P] → T012 → [T013 [P], T014] → T015
Phase 4:   [T016 [P], T017 [P]] → T018 → [T019 [P], T020] → T021 → T022
Phase 5:   [T023 [P], T024 [P], T025 [P]] → T026 → T027 → T028
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (**CRITICAL**)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Camera → capture → confirm → preparing phase works end-to-end

### Incremental Delivery

1. Phase 1 + 2 → Foundation ready (types + pipeline updated)
2. Phase 3 (US1) → Camera capture works; file upload unchanged ✅
3. Phase 4 (US2) → Head-crop replaces Phase 1A square crop; brick height selector live ✅
4. Phase 5 → Polish, snapshots committed, cross-browser verified → **Phase 1B/1C-pre complete**

---

## Summary

| Phase | Story | Tasks | Parallelizable |
|---|---|---|---|
| 1 — Setup | — | T001–T004 (4) | T004 (1) |
| 2 — Foundational | — | T005–T010 (6) | T006–T010 (5) |
| 3 — US1 Camera Capture | P1 | T011–T015 (5) | T011, T013 (2) |
| 4 — US2 Head-Height Crop | P2 | T016–T022, T029 (8) | T016, T017, T019 (3) |
| 5 — Polish | — | T030, T023–T028 (7) | T030, T023–T025 (4) |
| **Total** | | **30 tasks** | **15 parallelizable** |

---

## Notes

- T003 is a **manual step** (external download from Google CDN) — cannot be automated
- `@mediapipe/tasks-vision` may have the same Vitest/Node ESM issue as culori in Phase 1A — use `tests/mocks/head-detection.mock.ts` (T004) in all test files that transitively import `head-detection.ts`
- Phase 1A tests MUST still pass after Phase 2 foundational changes (T026 verifies this)
- Regression snapshots must be committed after T027 — Constitution Principle V requires this
- Camera stream teardown (T024) is safety-critical — a running camera stream leaks device access
