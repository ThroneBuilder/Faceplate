# Implementation Plan: Phase 1B/1C-pre — Camera Capture and Seeded Manual Head-Height Crop

**Branch**: `002-camera-face-crop` | **Date**: 2026-05-31 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-camera-face-crop/spec.md`

---

## Summary

Add camera capture as the primary image acquisition path and replace Phase 1A's fixed-square manual crop with a seeded-handle crop tool that auto-positions top/bottom bounds from MediaPipe head detection, enforces a 32:H aspect ratio (centered), and lets the user choose mosaic height (26–36 bricks). All processing remains client-side. The mosaic pipeline is updated to support variable height.

---

## Technical Context

**Language/Version**: TypeScript 5.x + Astro 4.x (same as Phase 1A)

**New Dependencies**:
- `@mediapipe/tasks-vision` — FaceLandmarker WASM (head detection, deterministic, FR-020)
- `exifr` (lite build) — EXIF orientation correction before crop (FR-021)

**Removed Dependencies**:
- `cropperjs` — superseded by custom crop tool (~200 lines TS)

**Storage**: N/A — browser session only (unchanged)

**Testing**: Vitest (`environment: 'node'`) — `@mediapipe/tasks-vision` mocked in test environment; `head-crop.ts` and `exif.ts` are pure functions testable directly

**Target Platform**: Browser — Chrome, Firefox, Safari (latest 2 versions); desktop and mobile

**Performance Goals**:
- Camera viewfinder: real-time (≤33ms per frame)
- EXIF correction: imperceptible (<50ms)
- MediaPipe model load: lazy on first crop screen; ~500ms–2s; cached for session
- Head detection inference: ~100–300ms (one-shot after model load)
- Mosaic generation: unchanged (<10s, typically <1s)

**Constraints**:
- Client-side only — no server transmission (FR-018, Constitution Principle I)
- Head detection deterministic (FR-020, Constitution Principle III)
- MediaPipe model bundled in `public/models/` — no CDN runtime fetch
- Camera stream MUST be stopped when leaving camera phases

**Scale/Scope**: Single-user browser session (unchanged)

---

## Constitution Check

*Gates from `.specify/memory/constitution.md` v1.0.0.*

| Gate | Principle | Result | Notes |
|---|---|---|---|
| Client-only processing | I, II | ✅ | Camera, EXIF, MediaPipe all in-browser; model bundled, no CDN fetch |
| Deterministic output | III | ✅ | FR-020 + MediaPipe WASM is bit-exact; EXIF via `createImageBitmap` is deterministic |
| Schema extensibility | IV | ✅ | `HeadBounds.landmarkData` reserved; `CameraSession.preferredFacing` reserved |
| Snapshot coverage | V | ✅ | New snapshots for 32×28 and 32×36; existing 32×32 snapshot must still pass |
| Algorithmic baseline | VI | ✅ | FR-017: detection fails → full-image handles; feature works without MediaPipe |
| TypeScript strict | Constraints | ✅ | All new modules use strict TypeScript |

---

## Project Structure

### Documentation (this feature)

```text
specs/002-camera-face-crop/
├── plan.md              # This file
├── research.md          # Phase 0 research (MediaPipe, EXIF, custom crop)
├── data-model.md        # Updated types + new entities
├── quickstart.md        # Setup, dependencies, implementation order
├── contracts/
│   ├── pipeline-api.md  # Updated generateMosaic + new lib module contracts
│   └── ui-state.md      # New AppState phases + transition functions
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code Changes

```text
# New files
src/lib/image/exif.ts
src/lib/image/head-detection.ts
src/lib/crop/head-crop.ts
src/components/CameraViewfinder.astro
src/components/CameraPreview.astro
src/components/HeadCropTool.astro
public/models/face_landmarker.task       (~4 MB, downloaded during setup)
tests/unit/exif.test.ts
tests/unit/head-crop.test.ts
tests/mocks/head-detection.mock.ts
tests/regression/__snapshots__/mosaic-32x28.snap.json
tests/regression/__snapshots__/mosaic-32x36.snap.json

# Updated files
src/types/index.ts                       BrickHeight, HeadBounds, HeadCropSelection,
                                         CapturedPhoto, CameraSession; updated Mosaic,
                                         AdjustedImage, AppState, MosaicOptions
src/lib/app-state.ts                     New camera + head-crop transitions
src/lib/mosaic/pipeline.ts               height: BrickHeight option
src/lib/mosaic/parts-list.ts             totalPieces = 32 × height
src/components/UploadArea.astro          Camera option above upload
src/components/PartsList.astro           Updated total pieces display
src/pages/index.astro                    Wire new state phases

# Removed
cropperjs (package)                      Replaced by HeadCropTool custom implementation
```

**Structure Decision**: Single Astro project at repo root (unchanged). New lib modules under `src/lib/crop/` for the crop geometry code; camera and EXIF under `src/lib/image/`.

---

## Complexity Tracking

| Decision | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| MediaPipe WASM model (~4 MB in `public/`) | Only deterministic head landmark detection for browsers | Pure algo fails SC-002 (80%); face-api.js fails FR-020 (non-deterministic across GPU backends) |
| Custom crop tool (replaces cropperjs) | Top/bottom-only handles + auto aspect ratio | Constraining cropperjs requires fighting its state machine every pointer event — more code and jitter than a clean 200-line custom implementation |

---

## Phase Artifacts

| Artifact | File | Status |
|---|---|---|
| Feature spec | `specs/002-camera-face-crop/spec.md` | ✅ Complete (4 clarifications) |
| Research | `specs/002-camera-face-crop/research.md` | ✅ Complete |
| Data model | `specs/002-camera-face-crop/data-model.md` | ✅ Complete |
| Pipeline API contract | `specs/002-camera-face-crop/contracts/pipeline-api.md` | ✅ Complete |
| UI state contract | `specs/002-camera-face-crop/contracts/ui-state.md` | ✅ Complete |
| Quickstart | `specs/002-camera-face-crop/quickstart.md` | ✅ Complete |
| Tasks | `specs/002-camera-face-crop/tasks.md` | ⏳ Next (`/speckit-tasks`) |
