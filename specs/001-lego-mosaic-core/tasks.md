---
description: "Task list for Phase 1A — Core LEGO Mosaic Generator"
---

# Tasks: Phase 1A — Core LEGO Mosaic Generator

**Input**: Design documents from `specs/001-lego-mosaic-core/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Included — architecture constraints explicitly require automated regression tests
(Constitution Principle V; spec architecture constraint: "Mosaic generation must be testable via
automated regression tests").

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.
Bottom-up implementation order (lib → components → page) is maintained within each story phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P] tasks in the same phase
- **[Story]**: User story this task belongs to (US1–US4)
- Exact file paths included in every task description

---

## Phase 1: Setup

**Purpose**: Initialize the Astro project, install dependencies, and configure tooling.

- [X] T001 Initialize Astro project at repo root with TypeScript template: `pnpm create astro@latest . --template minimal --typescript strict --no-git`
- [X] T002 Install runtime dependencies: verify cropperjs stability at [github.com/fengyuanchen/cropperjs/releases](https://github.com/fengyuanchen/cropperjs/releases) first, then `pnpm add culori cropperjs@^2` (or `cropperjs@^1` + `@types/cropperjs` if v2 is still pre-stable)
- [X] T003 [P] Install dev dependencies: `pnpm add -D vitest @vitest/coverage-v8 canvas @types/canvas jsdom`
- [X] T004 [P] Create `astro.config.mjs` with `output: 'static'` per `specs/001-lego-mosaic-core/quickstart.md`
- [X] T005 [P] Create `vitest.config.ts` with `environment: 'node'`, `globals: true`, include `tests/**/*.test.ts` per `specs/001-lego-mosaic-core/quickstart.md`
- [X] T006 [P] Verify `tsconfig.json` has `"strict": true`; update if the Astro scaffold set it otherwise
- [X] T048 Create `.github/workflows/ci.yml`: run `pnpm test` on every push and pull request targeting `master`; add a path filter for `src/lib/**` to satisfy Constitution Principle V ("CI MUST run snapshot tests on every PR touching `src/lib/`")

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared infrastructure required before any user story can be implemented.
No user story work begins until this phase is complete.

- [X] T007 Define all TypeScript types in `src/types/index.ts`: `LegoColor`, `FaceImage`, `CropSelection`, `AdjustedImage`, `Mosaic`, `RgbGrid`, `ColorMatrix`, `PartsListEntry`, `PartsList`, `AppState` (discriminated union per `contracts/ui-state.md`), `PipelineError`
- [X] T008 [P] Create `src/data/lego-palette.json` with all LEGO 1×1 square plate colors sourced from the lego-art-remix reference; include `id`, `name`, `rgb` fields; validate each entry against the schema in `data-model.md`
- [X] T009 [P] Implement `src/lib/app-state.ts`: `AppState` discriminated union and all transition functions (`onFileSelected`, `onFileValidated`, `onFileValidationError`, `onCropConfirmed`, `onAdjustmentChanged`, `onGenerateClicked`, `onGenerateSuccess`, `onResetToCrop`, `onReset`) per `contracts/ui-state.md`
- [X] T010 [P] Add test fixture files: `tests/fixtures/test-face.jpg` (a representative face photo) and `tests/fixtures/solid-white.png` (255,255,255 uniform image, 200×200px)
- [X] T011 [P] Create `src/pages/index.astro` skeleton: import all component placeholders, add a `<script>` tag that imports `src/lib/app-state.ts`, add placeholder `<div>` mount points for each component per `quickstart.md`

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 — Upload and Crop a Face Image (Priority: P1) 🎯 MVP

**Goal**: User can select a JPEG/PNG, crop it to a square ≥100×100 px, and see a confirmed square preview.

**Independent Test**: Upload any JPEG/PNG, drag crop handles to a valid square region, confirm the crop, and verify the square preview is displayed with no errors. Verify that uploading a non-image file shows an error. Verify that a crop < 100×100 shows a warning and blocks proceeding.

### Tests for User Story 1

> **Write tests FIRST — confirm they fail before implementing.**

- [X] T012 [P] [US1] Write unit tests for `src/lib/image/validate.ts` in `tests/unit/validate.test.ts`: test valid JPEG, valid PNG, invalid MIME type, file > 10MB, image dimensions < 100×100, image dimensions ≥ 100×100

### Implementation for User Story 1

- [X] T013 [US1] Implement `src/lib/image/validate.ts`: export `validateFile(file: File): Promise<FaceImage>` — check MIME type (jpeg/png only, throw `PipelineError('INVALID_FILE_TYPE')` otherwise), file size ≤ 10 MB (throw `PipelineError('FILE_TOO_LARGE')`), load image and check natural dimensions ≥ 100×100 (throw `PipelineError('IMAGE_TOO_SMALL')`); on success return `FaceImage` (depends on T007, T012)
- [X] T014 [P] [US1] Implement `src/components/UploadArea.astro`: file `<input>` (accept="image/jpeg,image/png"), inline privacy notice ("Your image never leaves your device"), error message slot, emits `fileSelected` custom event (depends on T007)
- [X] T015 [US1] Implement `src/components/CropTool.astro`: initialize `cropperjs` on the uploaded image with `aspectRatio: 1`; expose a Confirm button that reads `cropper.getCroppedCanvas()` and resolves a `CropSelection`; enforce minimum 100×100 via `cropperjs` `minCropBoxWidth`/`minCropBoxHeight`; emit `cropConfirmed` and `cropTooSmall` custom events (depends on T013)
- [X] T016 [US1] Wire US1 flow in `src/pages/index.astro`: handle `fileSelected` → call `validateFile` → transition state via `onFileValidated`/`onFileValidationError`; handle `cropConfirmed` → call `onCropConfirmed`; show/hide `UploadArea` and `CropTool` components based on `AppState.phase`; display crop-error warning when `phase === 'crop-error'` (depends on T009, T014, T015)

**Checkpoint**: User Story 1 independently functional — upload → crop → preview works end-to-end.

---

## Phase 4: User Story 2 — Adjust Brightness and Contrast (Priority: P2)

**Goal**: After cropping, user moves sliders to tune the image and sees a live-updating preview.

**Independent Test**: Upload and crop an image, then move both sliders to their extremes and back. Verify preview updates visibly in real time. Verify that at offset (0, 0) the preview is identical to the crop output.

### Tests for User Story 2

> **Write tests FIRST — confirm they fail before implementing.**

- [X] T017 [P] [US2] Write unit tests for `src/lib/image/adjust.ts` in `tests/unit/adjust.test.ts`: test identity at (0,0), brightness clamping at ±128, contrast clamping at ±128, extreme combo (max brightness + max contrast), alpha channel preserved, output deterministic for same input

### Implementation for User Story 2

- [X] T018 [US2] Implement `src/lib/image/adjust.ts`: export `applyAdjustments(imageData: ImageData, brightness: number, contrast: number): ImageData` using brightness add-and-clamp and contrast factor formula from `research.md`; returns new `ImageData`, does not mutate input (depends on T007, T017)
- [X] T019 [US2] Implement `src/components/AdjustmentPanel.astro`: brightness slider (−128 to +128, default 0), contrast slider (−128 to +128, default 0), live `<canvas>` preview wired to `applyAdjustments`, "Generate Mosaic" button; emit `adjustmentChanged` and `generateClicked` custom events (depends on T018)
- [X] T020 [US2] Wire US2 flow in `src/pages/index.astro`: handle `adjustmentChanged` → call `applyAdjustments` → redraw preview canvas → call `onAdjustmentChanged`; handle `generateClicked` → transition to `'generating'`; show/hide `AdjustmentPanel` based on `AppState.phase` (depends on T009, T016, T018, T019)

**Checkpoint**: User Story 2 independently functional — crop → adjust sliders → live preview works.

---

## Phase 5: User Story 3 — Generate LEGO Mosaic (Priority: P3)

**Goal**: User clicks Generate and sees a deterministic 32×32 LEGO-palette mosaic displayed alongside the original crop within ~1s.

**Independent Test**: Supply a fixed crop at default adjustments, click Generate, verify 32×32 mosaic grid appears with LEGO palette colors. Run Generate again with the same input and verify the output is identical (determinism check).

### Tests for User Story 3

> **Write tests FIRST — confirm they fail before implementing.**

- [X] T021 [P] [US3] Write unit tests for `src/lib/mosaic/downsample.ts` in `tests/unit/downsample.test.ts`: test output is 32×32 for any valid input size, all RGB values in [0,255], deterministic for identical `ImageData`
- [X] T022 [P] [US3] Write unit tests for `src/lib/mosaic/color-match.ts` in `tests/unit/color-match.test.ts`: test every output cell value exists in palette, output dimensions match input grid dimensions, deterministic for identical input
- [X] T023 [US3] Write regression test for `src/lib/mosaic/pipeline.ts` in `tests/regression/mosaic-pipeline.test.ts`: load `tests/fixtures/test-face.jpg` via `canvas` npm `loadImage`, call `generateMosaic`, assert result is 32×32, call `toMatchFileSnapshot('tests/regression/__snapshots__/mosaic-32x32.snap.json')` (depends on T021, T022)

### Implementation for User Story 3

- [X] T024 [P] [US3] Implement `src/lib/mosaic/downsample.ts`: export `downsampleToGrid(imageData: ImageData, gridW: number, gridH: number): RgbGrid` using manual average pooling — for each grid cell, compute the bounding pixel range in the source, average R/G/B independently, clamp to [0,255] (depends on T007)
- [X] T025 [P] [US3] Implement `src/lib/mosaic/color-match.ts`: export `matchColors(grid: RgbGrid, palette: LegoColor[]): number[][]` — build a `culori nearest(palette, differenceCie2000)` finder once per call, map each cell's RGB to the nearest palette color ID (depends on T007, T008)
- [X] T026 [US3] Implement `src/lib/mosaic/pipeline.ts`: export `generateMosaic(imageData: ImageData, palette: LegoColor[], options?: MosaicOptions): Mosaic` — orchestrate `downsampleToGrid → matchColors → assemble Mosaic`; throw `PipelineError('EMPTY_PALETTE')` if palette is empty (depends on T024, T025)
- [ ] T027 [US3] Run regression tests to generate initial snapshot: `pnpm test --update-snapshots`; commit `tests/regression/__snapshots__/mosaic-32x32.snap.json` to source control (depends on T023, T026)
- [X] T028 [US3] Implement `src/components/MosaicDisplay.astro`: render the 32×32 mosaic as a CSS grid of colored `<div>` cells using `LegoColor.rgb` values; display the original cropped image alongside at equal size (FR-008, FR-011) (depends on T007)
- [X] T029 [US3] Wire US3 flow in `src/pages/index.astro`: handle `generateClicked` → disable Generate button → show progress indicator + "Generating mosaic…" message → call `generateMosaic` with current `AdjustedImage` and palette → call `onGenerateSuccess` → re-enable button → hide indicator → render `MosaicDisplay` (FR-014; depends on T009, T020, T026, T028)

**Checkpoint**: User Story 3 independently functional — Generate produces deterministic 32×32 mosaic; regression snapshot is committed.

---

## Phase 6: User Story 4 — View Color Matrix and Parts List (Priority: P4)

**Goal**: After generation, user can see a labeled 32×32 color-identifier grid and an aggregated parts count list summing to exactly 1,024.

**Independent Test**: Trigger mosaic generation, then verify a 32×32 grid of color names is displayed and a parts list is shown with counts that sum to exactly 1,024. Use the solid-white fixture and verify the parts list contains exactly 1 entry with count 1,024.

### Tests for User Story 4

> **Write tests FIRST — confirm they fail before implementing.**

- [X] T030 [P] [US4] Write unit tests for `src/lib/mosaic/parts-list.ts` in `tests/unit/parts-list.test.ts`: test `totalPieces === 1024` for any valid mosaic, no duplicate `colorId` entries, `entries` sorted descending by count, solid-white mosaic produces exactly 1 entry with count 1024

### Implementation for User Story 4

- [X] T031 [US4] Implement `src/lib/mosaic/parts-list.ts`: export `derivePartsList(mosaic: Mosaic, palette: LegoColor[]): PartsList` — aggregate `grid` cell counts by color ID, sort descending by count, assert `totalPieces === 1024`, return `PartsList` (depends on T007, T030)
- [X] T032 [P] [US4] Implement `src/components/ColorMatrix.astro`: render a 32×32 CSS grid where each cell shows the `LegoColor.name` for that position using small text; apply background color from `LegoColor.rgb` for readability (depends on T007)
- [X] T033 [US4] Implement `src/components/PartsList.astro`: render a list of `PartsListEntry` items sorted by count descending; each row shows a color swatch, color name, and count; display total piece count at the bottom (depends on T007, T031)
- [X] T034 [US4] Wire US4 output in `src/pages/index.astro`: in the `'result'` phase, call `derivePartsList` with the generated mosaic and render `ColorMatrix` and `PartsList` alongside `MosaicDisplay`; pass correct props (depends on T009, T029, T031, T032, T033)

**Checkpoint**: User Story 4 independently functional — color matrix and parts list display correctly; parts sum verified at 1,024.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Edge case handling, validation completeness, cross-browser verification, and performance confirmation.

- [ ] T036 [P] Verify `src/components/CropTool.astro` enforces minimum crop size: if user attempts to confirm a selection < 100×100, display inline warning and disable the Confirm button until selection is valid (FR-002)
- [ ] T037 [P] Add 10 MB file size error path in `src/components/UploadArea.astro`: display "File exceeds the 10 MB limit" inline if `file.size > 10_485_760` (spec assumption)
- [ ] T038 [P] Verify re-crop edge case in `src/pages/index.astro`: add a "Re-crop" button visible in `'adjusting'` and `'result'` phases that calls `onResetToCrop` and clears the mosaic and parts list from the DOM (spec edge case)
- [X] T039 Run full Vitest test suite: `pnpm test --coverage`; confirm all unit and regression tests pass with zero failures
- [X] T040 Manual cross-browser validation against SC-006: open the static build (`pnpm build && pnpm preview`) in the two most recent versions of Chrome, Firefox, and Safari; complete the full upload → crop → adjust → generate → view flow in each
- [X] T041 Validate SC-002 performance: using `test-face.jpg` fixture, measure time from Generate click to mosaic displayed; confirm < 10 seconds (expected < 1s for 32×32 canvas operations)
- [X] T042 Validate SC-003 invariant: for both test fixtures, confirm `PartsList.totalPieces === 1024` is displayed; run `pnpm test` to confirm the assertion in `parts-list.test.ts` covers this

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Requires Phase 1 complete — **BLOCKS all user stories**
- **US1 (Phase 3)**: Requires Phase 2 — no dependency on US2/US3/US4
- **US2 (Phase 4)**: Requires Phase 2 — no dependency on US1/US3/US4 (can run in parallel with US1 if staffed)
- **US3 (Phase 5)**: Requires Phase 2 and US2 (`AdjustedImage` is the pipeline input) — depends on US2
- **US4 (Phase 6)**: Requires Phase 2 and US3 (`Mosaic` is the input) — depends on US3
- **Polish (Phase 7)**: Requires all user story phases complete

### User Story Dependencies

- **US1 (P1)**: Foundational only → independent
- **US2 (P2)**: Foundational only → independent from US1 (but US1 provides the input to US2 in the live UI)
- **US3 (P3)**: Requires US2 complete (pipeline input is `AdjustedImage`)
- **US4 (P4)**: Requires US3 complete (input is `Mosaic`)

### Within Each Phase

- Tests MUST be written and verified to fail before the corresponding implementation tasks
- `src/types/index.ts` (T007) MUST be complete before any lib implementation
- `src/data/lego-palette.json` (T008) MUST be complete before T025 (color matching)
- Lib modules before components, components before page wiring

### Parallel Opportunities

```
Phase 1:   T001 → T002 → T003 → [T004, T005, T006, T048]
Phase 2:   T007 → [T008, T009, T010, T011]
Phase 3:   T012 [P] → T013 → [T014 [P], T015] → T016
Phase 4:   T017 [P] → T018 → T019 → T020
Phase 5:   [T021 [P], T022 [P]] → T023 → [T024 [P], T025 [P]] → T026 → T027 → T028 → T029
Phase 6:   T030 [P] → T031 → [T032 [P], T033] → T034
Phase 7:   [T035 [P], T036 [P], T037 [P], T038 [P]] → T039 → [T040, T041, T042]
```

---

## Phase 8: Deployment — Render.com Static Hosting

**Purpose**: Deploy the static Astro build to Render.com and verify the live site works end-to-end.

- [X] T043 Create `render.yaml` at repo root: static site service with `buildCommand: pnpm build`, `staticPublishPath: dist`, Node version 20
- [X] T044 [P] Create `.node-version` or `engines` field in `package.json` specifying Node 20 so Render picks up the correct runtime
- [X] T045 Connect the GitHub repository to Render.com: create a new Static Site service pointing at this repo's `master` branch; confirm environment auto-detects `render.yaml`
- [X] T046 Verify deployed Render URL loads the app, completes the full upload → crop → adjust → generate → view flow, and shows no console errors
- [X] T047 [P] Add the Render deploy URL to `README.md`

**Checkpoint**: Live site accessible at the Render URL; full feature flow works in the deployed environment.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (**CRITICAL**)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: A user can upload, crop, and see the confirmed preview

### Incremental Delivery

1. Phase 1 + 2 → Foundation ready
2. Phase 3 (US1) → Upload + Crop working independently → demo-able
3. Phase 4 (US2) → Brightness/contrast sliders working independently → demo-able
4. Phase 5 (US3) → Full mosaic generation + regression snapshot committed → demo-able
5. Phase 6 (US4) → Color matrix + parts list → **full Phase 1A feature complete**
6. Phase 7 → Polish, edge cases, cross-browser verification → **shippable**
7. Phase 8 → Deploy to Render.com → **live**

---

## Summary

| Phase | User Story | Tasks | Parallelizable |
|---|---|---|---|
| 1 — Setup | — | T001–T006, T048 (7) | T004–T006, T048 (4) |
| 2 — Foundational | — | T007–T011 (5) | T008–T011 (4) |
| 3 — US1 Upload & Crop | P1 | T012–T016 (5) | T012, T014 (2) |
| 4 — US2 Adjust | P2 | T017–T020 (4) | T017 (1) |
| 5 — US3 Generate | P3 | T021–T029 (9) | T021, T022, T024, T025 (4) |
| 6 — US4 Matrix & Parts | P4 | T030–T034 (5) | T030, T032 (2) |
| 7 — Polish | — | T036–T042 (7) | T036–T038 (3) |
| 8 — Deployment | — | T043–T047 (5) | T044, T047 (2) |
| **Total** | | **47 tasks** | **22 parallelizable** |

---

## Notes

- `[P]` tasks target different files and have no incomplete-task dependencies — safe to parallelize
- `[US#]` labels map directly to user stories in `specs/001-lego-mosaic-core/spec.md`
- Regression snapshot (`tests/regression/__snapshots__/mosaic-32x32.snap.json`) MUST be committed after T027
- Each user story phase ends with a named **Checkpoint** — validate independently before proceeding
- Constitution Principle V: any future pipeline change that breaks the snapshot requires `--update-snapshots` + PR explanation
