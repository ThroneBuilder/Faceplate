# Tasks: Phase 004 — Face Shaping

**Input**: Design documents from `specs/004-face-shaping/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on in-progress tasks)
- **[Story]**: Which user story this task belongs to
- File paths are relative to repository root

---

## Phase 1: Setup

**Purpose**: One structural change required before any implementation can begin.

- [x] T001 Move `public/Cubby.JPEG` → `public/images/Cubby.JPEG` (already done during `/speckit-plan`); update any existing references in codebase

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Types and pure-function library that every user story depends on. MUST complete before Phase 3.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Add `FaceMaskRow` and `FaceMask` interfaces to `src/types/index.ts`; extend `AppState` union with `{ phase: 'face-shaping'; crop: HeadCropSelection; mosaic: Mosaic; mask: FaceMask; key: CandidateKey }` variant — per `data-model.md`
- [x] T003 [P] Implement `buildInitialMask(mosaicWidth, mosaicHeight): FaceMask`, `toggleMaskCell(mask, row, col): FaceMask`, and `isCellVisible(mask, row, col): boolean` in `src/lib/face-shaping/mask.ts` — ellipse init (semi-axes 40%/48%) and boundary-set toggle per `contracts/pipeline-api.md` and `data-model.md`
- [x] T004 [P] Unit tests for `src/lib/face-shaping/mask.ts` in `tests/unit/face-mask.test.ts` — 8 cases: `buildInitialMask` center visible / corners masked / symmetry; `toggleMaskCell` visible→masked / masked→visible / right-edge / double-toggle / tiebreak — per `quickstart.md` test scenarios
- [x] T005 Add `onFaceShapingStart` and `onMaskCellClicked` to `src/lib/app-state.ts`: `onFaceShapingStart` takes `mosaic-confirmed` state, calls `buildInitialMask`, returns `face-shaping` state; `onMaskCellClicked` takes `face-shaping` state + `(row, col)`, calls `toggleMaskCell`, returns updated `face-shaping` state — per `contracts/ui-state.md` — depends on T002, T003

**Checkpoint**: Run `pnpm test` — all existing tests must pass before proceeding.

---

## Phase 3: User Story 1 — View the Face Shaping Step (Priority: P1) 🎯 MVP

**Goal**: After confirming a mosaic the user immediately sees the "Shape your face" two-panel layout with the initial ellipse mask rendered in the left panel. The right panel shows the cubby canvas (image load can be a placeholder at this stage).

**Independent Test**: Confirm a mosaic → verify heading "Shape your face" appears, the left panel shows the mosaic grid with edge cells visibly dimmed (~50% opacity), no result row or candidate section is visible.

### Implementation

- [x] T006 [P] [US1] Create `src/components/FaceShapingSection.astro` — outer `<section id="face-shaping-section" hidden>`, `<h2>Shape your face</h2>`, `<div class="face-shaping-panels">` containing `<div class="panel panel--editor">` (hosts mask editor) and `<div class="panel panel--cubby">` (hosts `<canvas id="cubby-canvas">`); CSS: panels side-by-side via flexbox, equal width, responsive wrap at ≤600px — per `contracts/ui-state.md` component tree
- [x] T007 [P] [US1] Create `src/components/MosaicMaskEditor.astro` — renders `<div id="mask-editor-grid">` as a CSS grid container; individual brick cells are injected by JS (not statically rendered in Astro); export the component for use in FaceShapingSection — per `contracts/ui-state.md`
- [x] T008 [US1] Add `<FaceShapingSection />` to `src/pages/index.astro` HTML (after `<CandidateSection />`); add DOM refs: `faceShapingSectionEl`, `maskEditorGridEl`, `cubbyCanvasEl`; add `hide(faceShapingSectionEl)` to `resetDownstream()`; import `onFaceShapingStart`, `onMaskCellClicked` from `../lib/app-state.js` — depends on T006, T007
- [x] T009 [US1] Implement `renderMaskEditor(mosaic, mask, palette)` function in `src/pages/index.astro` script — clears and rebuilds `maskEditorGridEl` as a CSS grid of `mosaic.width × mosaic.height` `<div>` cells; each cell has `data-row` and `data-col`; visible cells get full brick colour background; masked cells (`isCellVisible` returns false) get brick colour at `opacity: 0.5`; set `grid-template-columns: repeat(W, Npx)` so cells fill the panel width with a minimum of 8px per cell (i.e., `brickPx = max(8, floor(panelWidth / mosaic.width))`) to ensure cells are reliably clickable — depends on T008
- [x] T010 [US1] Change `mosaic-confirmed` case in `renderPhase` in `src/pages/index.astro` to auto-transition: call `onFaceShapingStart(state)`, update `appState`, immediately call `renderPhase(appState)` and return; add `face-shaping` case to `renderPhase`: show `faceShapingSectionEl`, hide `resultRowEl`, call `renderMaskEditor`; ensure `pnpm test` still passes — depends on T008, T009, T005

**Checkpoint**: Confirm a mosaic → "Shape your face" heading appears, mosaic grid with ellipse mask shown (corners dimmed), no result row. `pnpm test` passes.

---

## Phase 4: User Story 2 — Adjust the Face Mask by Clicking (Priority: P2)

**Goal**: Clicking a cell in the mask editor extends or retracts the mask for that row toward the nearest horizontal edge. The mask editor re-renders immediately on each click.

**Independent Test**: Click a visible cell near the left edge → that cell and all cells to its left in that row become dimmed. Click the same cell again → they become visible again.

### Implementation

- [x] T011 [US2] Add click event handler to `maskEditorGridEl` in `src/pages/index.astro` script — delegate clicks via `closest('[data-row]')`; extract `row` and `col` from `dataset`; call `onMaskCellClicked(appState, row, col)`; update `appState`; call `renderMaskEditor` to reflect new mask — depends on T009, T010; per `contracts/ui-state.md` click handler

**Checkpoint**: Click any cell in the mosaic grid → mask boundary updates for that row. Two clicks at the same cell return to prior state. Cubby canvas is not yet required for this checkpoint.

---

## Phase 5: User Story 3 — Cubby Projection with Shadow (Priority: P3)

**Goal**: The right panel shows the masked mosaic composited onto `Cubby.JPEG` centred over the white plate, with shadow gradients at the face boundary. Updates instantly on every mask change.

**Independent Test**: Verify the cubby canvas shows the mosaic over the white plate area. Mask a left-side row → that row's left cells disappear from the projection and a shadow gradient appears at the new boundary.

### Implementation

- [x] T012 [P] [US3] Implement plate constants (`PLATE_X=671, PLATE_Y=585, PLATE_W=340, PLATE_H=350, CUBBY_W=1682, CUBBY_H=1457`) and `loadCubbyImage(): Promise<HTMLImageElement>` in `src/lib/face-shaping/cubby-render.ts` — loads from `/images/Cubby.JPEG`; resolves to the cached image element; rejects gracefully with console warning if load fails — per `research.md` Decision 6 and `contracts/pipeline-api.md`
- [x] T013 [US3] Implement `renderCubbyProjection(ctx, cubbyImage, mosaic, mask, palette)` in `src/lib/face-shaping/cubby-render.ts` — (1) `ctx.drawImage(cubbyImg, 0, 0, CUBBY_W, CUBBY_H)` fills background; (2) compute `brickPx = floor(min(PLATE_W/W, PLATE_H/H))`, `offsetX = PLATE_X + floor((PLATE_W - brickPx*W)/2)`, `offsetY = PLATE_Y + floor((PLATE_H - brickPx*H)/2)`; (3) for each visible cell fill `fillRect` with brick colour — per `research.md` Decision 4 and 7; depends on T012
- [x] T014 [US3] Add shadow gradient rendering to `renderCubbyProjection` in `src/lib/face-shaping/cubby-render.ts` — after all brick fills, for each row r: if `leftCol > 0` draw a left-side `createLinearGradient` from face edge extending 3 bricks left (`rgba(0,0,0,0.35)` → transparent); if `rightCol < W-1` draw right-side gradient extending 3 bricks right — per `research.md` Decision 5; depends on T013
- [x] T015 [US3] Wire cubby canvas into `src/pages/index.astro` — import `renderCubbyProjection`, `loadCubbyImage`; load cubby image once on page init and cache it; in `face-shaping` renderPhase case call `renderCubbyProjection`; in mask click handler call `renderCubbyProjection` after `renderMaskEditor`; set `cubbyCanvasEl.width = CUBBY_W`, `cubbyCanvasEl.height = CUBBY_H`, CSS `width: 100%`; render debug overlay (`strokeRect` in red) to verify plate alignment, calibrate constants if needed, remove overlay before commit — depends on T012, T013, T014, T010

**Checkpoint**: Confirm mosaic → face shaping panel shows live cubby projection. Click cells → cubby updates immediately. Shadow visible at face boundary edges. `pnpm test` passes.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, verification, and test validation.

- [x] T016 [P] Run `pnpm test` — verify all tests pass including new `face-mask.test.ts` (target: 149+ tests total after adding 8 new tests)
- [x] T017 Verify `mosaic-confirmed` result row is no longer shown (it is replaced by the auto-transition to `face-shaping`); remove any now-unreachable rendering code for the result row in the `mosaic-confirmed` case
- [ ] T018 Cross-browser smoke test: full flow (upload/camera → crop → 3×3 candidate grid → confirm mosaic → face shaping displays → click mask cells → cubby projection updates with shadow) in Chrome latest and Safari latest

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — already done
- **Phase 2 (Foundational)**: T002 blocks T003/T004/T005; T003 is parallel with T004; T005 depends on T002 + T003
- **Phase 3 (US1)**: Depends on Phase 2 (all 4 tasks) — T006 and T007 are parallel; T008 follows T006+T007; T009 follows T008; T010 follows T008+T009+T005
- **Phase 4 (US2)**: Depends on Phase 3 (T009, T010) — single task
- **Phase 5 (US3)**: T012 is parallel with Phase 3; T013 depends on T012; T014 depends on T013; T015 depends on T012–T014 + T010
- **Phase 6 (Polish)**: Depends on Phase 5 completion

### Parallel Opportunities

```bash
# Phase 2 — run simultaneously:
T003 (mask.ts implementation)  T004 (face-mask tests)

# Phase 3 — run simultaneously first:
T006 (FaceShapingSection.astro)  T007 (MosaicMaskEditor.astro)

# Phase 5 — T012 can start in parallel with Phase 3:
T012 (cubby-render.ts constants + loadCubbyImage)
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Complete Phase 2: Foundational (types + mask.ts + app-state)
2. Complete Phase 3: User Story 1 (layout + mask editor display + auto-transition)
3. **STOP AND VALIDATE**: Confirm mosaic → face shaping appears with ellipse mask, no result row
4. Demo-ready milestone — interactive mask display without cubby projection

### Incremental Delivery

1. Phase 2 → Foundation ready
2. Phase 3 → **MVP**: face shaping panel appears with initial mask
3. Phase 4 → **US2**: clicking adjusts mask
4. Phase 5 → **US3**: cubby projection with shadow (full feature)
5. Phase 6 → hardened, cross-browser tested

---

## Notes

- `src/lib/face-shaping/mask.ts` is the ONLY new file testable in Vitest node env; `cubby-render.ts` requires browser Canvas 2D and must be validated manually
- The `mosaic-confirmed` auto-transition in `renderPhase` replaces the result row display — the two-thumbnail row (original + mosaic) is no longer shown after this phase
- Plate constants in `cubby-render.ts` are initial estimates; calibrate visually with a debug overlay before final commit (see plan.md calibration step)
- `isCellVisible` is exported for use in `renderMaskEditor` (index.astro) to avoid reimplementing the boundary logic inline
- `FaceMask.rows` length must equal `mosaic.height`; enforce this in `buildInitialMask` and validate in `onMaskCellClicked` with a bounds check
