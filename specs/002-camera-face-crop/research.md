# Research: Phase 1B/1C-pre — Camera Capture and Seeded Manual Head-Height Crop

**Branch**: `002-camera-face-crop` | **Phase**: 0 (Pre-Design Research) | **Date**: 2026-05-31

---

## 1. Head Detection Library (FR-011, FR-020)

**Decision**: `@mediapipe/tasks-vision` FaceLandmarker with WASM backend

**Rationale**:
- Only candidate satisfying the hard determinism requirement (FR-020). WASM fixed-point arithmetic is bit-exact across Chrome, Firefox, and Safari.
- First-party TypeScript types bundled in the package.
- Landmark 152 = chin tip (anatomically precise bottom bound).
- Landmark 10 = mid-forehead. True skull top is not a standard landmark; use `landmark10.y - 0.10 * faceHeight` as a calibrated upward offset for the crown estimate (~10% of face height adds sufficient headroom for most portrait photos).
- Model file: `face_landmarker.task` (~4 MB) + WASM binary (~2 MB). Both are bundled in `public/models/` — no CDN dependency at runtime, satisfying the no-external-runtime-fetch constraint.

**Landmarks for head bounds**:
```
skull top  = landmark[10].y - (0.10 × faceHeight)   // calibrated crown estimate
chin bottom = landmark[152].y
```

**Alternatives considered**:
- `face-api.js` — eliminated by determinism requirement. Uses WebGL/CPU TF.js backends with float16/32 variance (~±0.5–2px per run). Also effectively unmaintained since 2022.
- `clm-tracker` — abandoned (~2018), no TypeScript types.
- Pure algorithmic (skin-tone segmentation + edge detection) — serves as the FR-017 fallback (detection unavailable → full image bounds used). Not viable as primary path for arbitrary user photos due to sensitivity to background color, hat, and varied lighting.

**Fallback path (Constitution Principle VI)**:
The feature functions entirely without detection via FR-017: if MediaPipe model fails to load, returns no landmarks, or produces a detection smaller than 150px, handles default to the full image edges. The seeded crop therefore provides a UX enhancement over the baseline (manual full-image crop), not a hard dependency.

---

## 2. EXIF Orientation Correction (FR-021)

**Decision**: `exifr` (lite build, `exifr/dist/lite.esm.js`) + manual `OffscreenCanvas` rotation

**Rationale**:
- `exifr` lite build is ~4 KB minzipped, ships first-party TypeScript types, tree-shakeable, supports JPEG/PNG/HEIC. Only the `Orientation` tag is needed; the lite entry point skips GPS, MakerNote, and other large tag groups.
- `createImageBitmap` intentionally ignores EXIF orientation across all spec'd browsers — raw pixels are always unrotated. This makes the correction deterministic: read orientation → apply known canvas transform → get correctly-oriented pixels.
- `OffscreenCanvas` keeps the correction off the main thread and is Web Worker compatible for future optimization.

**Pattern**:
```typescript
import { parse } from 'exifr/dist/lite.esm.js'
const { Orientation = 1 } = await parse(file, { pick: ['Orientation'] }) ?? {}
const bitmap = await createImageBitmap(file)
// swap canvas dims for orientations 5-8 (90°/270° rotations)
// apply ctx transform → drawImage → getImageData
```

**Alternatives considered**:
- `piexifjs` — no TypeScript types, dormant maintenance.
- `jpeg-exif` — no TypeScript types, limited browser-only support.
- `blueimp-load-image` — all-in-one but no bundled types and pulls in unneeded resize/crop logic.

---

## 3. Custom Crop Tool for Top/Bottom-Only Handles (FR-012–015)

**Decision**: Custom vanilla TypeScript implementation (~150–200 lines), no crop library

**Rationale**:
The problem has only two degrees of freedom (top-Y and bottom-Y); all other geometry is derived:
```
cropHeight = bottomY - topY
cropWidth  = cropHeight × (32 / brickHeight)
leftX      = (imageWidth - cropWidth) / 2   // always centered
```
Attempting to constrain cropperjs to only top/bottom handles requires fighting the library's internal state machine every pointer event (CSS-hiding handles does not disable them). The correction-on-every-event approach introduces jitter and is more code than a clean custom implementation.

**Implementation approach**:
- `<img>` tag renders the image.
- An absolutely-positioned overlay `<div>` contains two horizontal drag bars (top and bottom).
- Pointer Events API (`pointerdown` / `pointermove` / `pointerup` + `setPointerCapture`) handles touch and mouse uniformly.
- On every `pointermove`, recompute geometry and update overlay CSS in one frame.
- Clamp: `topY ∈ [0, bottomY - minHeight]`, `bottomY ∈ [topY + minHeight, imageHeight]`.
- When `brickHeight` changes, scale handles proportionally to maintain head-centered crop.

**cropperjs status**: Removed from production dependencies — the Phase 1A manual square crop is superseded by this custom crop tool.

---

## 4. Variable Mosaic Height

**Decision**: Extend `generateMosaic` to accept a `height` option from `BrickHeight` (26 | 28 | 30 | 32 | 34 | 36)

**Rationale**: The mosaic pipeline in Phase 1A was hard-coded to 32×32. The brick height selector now drives the mosaic output dimensions (32 wide, H high). The downsampling step (`downsampleToGrid`) already accepts `gridW` and `gridH` arguments — passing `(32, brickHeight)` requires no structural changes to the algorithm.

**Parts list**: `totalPieces` = 32 × brickHeight (prior invariant of 1024 no longer applies for non-32 heights). Range: 832 (26 bricks) to 1152 (36 bricks) before post-candidate masking.

**Regression snapshot**: The Phase 1A snapshot (`mosaic-32x32.snap.json`) remains for 32×32 regression. New snapshots will be added for non-square dimensions as part of this phase.

---

## 5. Camera Capture (getUserMedia)

**Decision**: Native `navigator.mediaDevices.getUserMedia` browser API — no npm dependency

**Rationale**: No library needed. The API is well-supported across Chrome, Firefox, and Safari (latest 2 versions). Key patterns:
- `getUserMedia({ video: { facingMode: 'user' } })` — requests front camera.
- `enumerateDevices()` — lists available cameras for the switch-camera control.
- `ImageCapture.takePhoto()` or `canvas.drawImage(videoElement)` — captures a still frame.
- Permission state checked via `navigator.permissions.query({ name: 'camera' })`.

**Error handling**: `NotAllowedError` = permission denied; `NotFoundError` = no camera available; `OverconstrainedError` = requested camera not found. All map to the `camera-error` app state with user-readable messages.

---

## 6. MediaPipe Model Bundling Strategy

**Decision**: Bundle `face_landmarker.task` in `public/models/`; load lazily on first crop screen appearance

**Rationale**:
- Bundling in `public/models/` keeps the no-runtime-CDN-fetch constraint (Constitution; research item 1).
- Lazy loading (fetch on crop screen arrival, not on page load) avoids a 4 MB penalty on initial page load for users who never reach the crop step.
- Model is loaded once and cached for the session. On failure to load, FR-017 fallback applies.
- Astro static output serves `public/` files directly; no special config needed.

---

## 7. Unresolved / Deferred

| Item | Status |
|---|---|
| Head detection performance target (latency on low-end device) | Deferred to testing — MediaPipe WASM typically ~100–300ms for first inference after model load; acceptable for a one-shot operation |
| Horizontal panning within the crop interface | Deferred — crop is auto-centered; user can adjust top/bottom handles; horizontal pan is post-candidate (left/right crop) |
| Web Worker offloading for EXIF + head detection | Deferred to optimization pass if main-thread jank observed |
