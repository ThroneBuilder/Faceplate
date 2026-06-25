# Tasks: Gallery Platform Expansion (007)

**Input**: Design documents from `specs/007-gallery-platform/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Unit tests included for pure functions (plate layout, random name). No TDD for UI/endpoint tasks.

**Organization**: Tasks are grouped by user story. Foundational phase (Phase 2) must complete before any story work begins.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on other in-progress tasks)
- **[Story]**: Maps to user story from spec.md

---

## Phase 1: Setup

**Purpose**: Verify project environment; no structural changes needed (existing Astro 4 / TypeScript project).

- [X] T001 Confirm `pnpm test` passes on branch `007-gallery-platform` before any changes (baseline)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Data types, algorithms, and helpers that multiple user stories depend on. MUST complete before any story implementation.

**⚠️ CRITICAL**: No story work begins until T002–T009 are complete.

- [X] T002 Update `gallery-groups.json` — add `game-of-thrones` (unlisted), `seattle-faces` (unlisted), and `hall-of-presidents` (unlisted, description: "recent US presidents"); update all six descriptions to match spec FR-003 (e.g. `"open sharing of face mosaics"` for hall-of-faces)
- [X] T003 [P] Add `getPublicGalleries(): GalleryGroup[]` and `getRestrictedGalleries(): GalleryGroup[]` helper exports to `src/lib/gallery/config.ts` (filter on `visibility`)
- [X] T004 [P] Add `PlateSpec` and `PlateLayoutResult` interfaces to `src/types/index.ts` per data-model.md (PlateSpec: id/width/height; PlateLayoutResult: top[][], bottom[][], plates[])
- [X] T005 [P] Add `name: string` field to `SubmissionRecord` interface in `src/lib/gallery/submissions.ts`; update `readAll()` to default missing `name` to `''` for backward compat
- [X] T006 [P] Implement `computePlateLayout(mask: FaceMask, mosaicWidth: 32, mosaicHeight: BrickHeight): PlateLayoutResult` in `src/lib/mosaic/plate-layout.ts` — greedy largest-fit algorithm: front layer horizontal-first, back layer vertical-first; piece set {1×1, 1×2, 1×3, 1×4, 2×2, 2×3, 2×4, 2×6, 2×8} and transpositions
- [X] T007 [P] Write unit tests for `computePlateLayout` in `tests/unit/plate-layout.test.ts`: (a) full-rectangle mask produces valid coverage; (b) masked cells produce 0 in both layers; (c) every cell in a non-zero slot maps to a valid plateId in the plates array; (d) no plate piece extends outside the mask
- [X] T008 [P] Implement `generateRandomName(): string` in `src/lib/gallery/random-name.ts` — format `{extreme-adj} {brick-adj} {noun}`, each drawn from a fixed embedded wordlist (≥10 words each); write one unit test in `tests/unit/random-name.test.ts` confirming output matches pattern and contains three words
- [X] T009 Create `src/components/GalleryNav.astro` — reads all galleries via `getGalleries()` server-side; renders right-side header nav with two labeled groups "Public" (visibility=public) and "Restricted" (visibility=unlisted); each entry is an `<a>` linking to `/{slug}`; accepts optional `currentSlug?: string` prop to highlight active gallery

**Checkpoint**: Run `pnpm test` — T007 and T008 tests must pass. All types compile. `gallery-groups.json` has 5 entries.

---

## Phase 3: User Story 1 — Gallery Discovery & Navigation (Priority: P1) 🎯 MVP

**Goal**: Every page shows a header nav with all galleries in two labeled groups; gallery pages show their correct description.

**Independent Test**: Quickstart Scenario 1 — visit any gallery page; observe "Public" and "Restricted" nav groups with 2 + 3 links; click each link; verify description in header.

- [X] T010 [US1] Import `GalleryNav` and render it in the right side of the header in `src/pages/[gallery].astro`; pass `currentSlug={slug}` prop; preserve existing heading/tagline layout
- [X] T011 [US1] Import `GalleryNav` and render it in the right side of the header in `src/pages/index.astro`; no currentSlug (not a gallery page)
- [X] T012 [US1] Update the gallery page `<p class="tagline">` in `src/pages/[gallery].astro` to render `gallery.description` (already available from `findGallery()`; descriptions now updated in T002)

**Checkpoint**: Navigate to `/hall-of-faces` — confirm 5 gallery links in header; confirm "open sharing of face mosaics" tagline.

---

## Phase 4: User Story 2 — Backing Plate Preview (Priority: P2)

**Goal**: While shaping the face, two small diagrams beside the shaping canvas show the front and back plate layouts, updating live as the mask changes.

**Independent Test**: Quickstart Scenario 2 (partial) — open face shaping step; observe two stacked diagrams to the right; adjust face shape; diagrams update within 1 second.

**Depends on**: T006 (`computePlateLayout`), T004 (`PlateLayoutResult` type)

- [X] T013 [US2] Add a plate preview panel to the face-shaping step UI in `src/pages/index.astro` — two stacked `<canvas>` elements (or `<svg>`) labeled "Front" and "Back", positioned to the right of the shaping canvas; size them at approximately half the shaping canvas height each
- [X] T014 [US2] Implement `renderPlateLayer(canvas: HTMLCanvasElement, layout: number[][], plates: PlateSpec[], cellPx: number): void` as a client-side helper in the inline script of `src/pages/index.astro` — fills each plate piece with a light background + 1px border; labels plates with width ≥ 4 AND height ≥ 2 (or transposed) with `{w}×{h}` centered in the piece
- [X] T015 [US2] Wire the plate preview to update whenever the face mask changes in `src/pages/index.astro` — call `computePlateLayout(mask, 32, mosaic.height)` then `renderPlateLayer()` for both Top and Bottom canvases; ensure update fires on initial mask render and after each mask adjustment

**Checkpoint**: Shape a face — two plate diagrams appear; labels visible on ≥2×4 pieces; diagrams refresh on mask change.

---

## Phase 5: User Story 3 — Named Sharing to Public Galleries (Priority: P3)

**Goal**: Sharing form has a required Name field (random default), only shows public galleries, and respects the `?gallery=` URL param.

**Independent Test**: Quickstart Scenario 2 (sharing form section) + Scenario 3 — observe pre-filled name, public-only dropdown, URL pre-selection.

**Depends on**: T003 (`getPublicGalleries`), T008 (`generateRandomName`), T005 (`name` in SubmissionRecord)

- [X] T016 [US3] Add a required `Name` input field to the sharing form in `src/pages/index.astro` — default value set by `generateRandomName()` called client-side; validate non-empty/non-whitespace on submit; show inline error if blank
- [X] T017 [US3] Replace the gallery selector in the sharing form in `src/pages/index.astro` with a dropdown populated only from `getPublicGalleries()` (passed as an Astro prop/variable); default selection is `hall-of-faces`; read `?gallery=` URL param client-side and pre-select matching public gallery (fall back to default if slug is not public)
- [X] T018 [US3] In `src/pages/index.astro` client script, build a basic `MosaicDataFile` JSON at share time — fields: `name`, `date` (ISO 8601), `size` (mosaic.height), `brightness`, `contrast`, `mosaic` (grid with 0 for masked cells) — send as `mosaic_json` File in FormData alongside `mosaic` PNG
- [X] T019 [US3] Update `src/pages/api/gallery/submit.ts` — (a) read and validate `name` field (required, max 80 chars, non-whitespace); (b) validate group is a public gallery; (c) save incoming `mosaic_json` as `{uuid}.json` instead of CSV; (d) store `name` in the `SubmissionRecord` written to manifest
- [X] T020 [US3] Update `src/pages/api/gallery/delete.ts` — unlink `{uuid}.json` instead of `{uuid}.csv` when deleting a submission

**Checkpoint**: Complete full share flow — confirm Name field, public-only dropdown, `?gallery=brickcon-2026` pre-selects BrickCon; submission creates `.json` file in gallery-data; submission rejected if name blank or gallery is restricted.

---

## Phase 6: User Story 4 — Gallery Name Hover Display (Priority: P4)

**Goal**: Hovering over any gallery mosaic shows the submitter's name as a tooltip.

**Independent Test**: Quickstart Scenario 2 (end) — submit a face with name "Jeff's Test Face"; on gallery page, hover over the new mosaic; tooltip shows "Jeff's Test Face".

**Depends on**: T005 (`name` in SubmissionRecord), T019 (name stored at submit time)

- [X] T021 [US4] Update `src/pages/[gallery].astro` — pass `name` from each `SubmissionRecord` into the batch/slot data structures alongside `uuid` and image URL
- [X] T022 [US4] Render a tooltip for each occupied mosaic slot in `src/pages/[gallery].astro` — add a `title={name}` attribute to the canvas wrapper or an absolutely-positioned `<span data-name={name}>` styled as a tooltip on hover; ensure it appears within 300ms (CSS `opacity` transition sufficient)

**Checkpoint**: Gallery page — hover over a submitted mosaic; tooltip shows the stored name.

---

## Phase 7: User Story 5 — Enhanced Data Export (Priority: P5)

**Goal**: The saved JSON file includes the full plate layout (top/bottom layer maps, plate spec lookup) and parts list alongside the existing mosaic data.

**Independent Test**: Quickstart Scenario 6 — download a data JSON file; verify it contains `top`, `bottom`, `plates`, and `parts` arrays with correct structure.

**Depends on**: T006 (`computePlateLayout`), T018 (basic JSON built), T019 (JSON saved to disk)

- [X] T023 [US5] Extend the `MosaicDataFile` JSON builder in `src/pages/index.astro` client script — (a) call `computePlateLayout(mask, 32, mosaic.height)` to get `top`, `bottom`, `plates`; (b) call `derivePartsList(mosaic, palette)` (existing function) and map entries to `{ name, partNumber, color, count }` using BrickLink part numbers where available; (c) include all fields in the JSON sent as `mosaic_json`
- [X] T024 [US5] Add `GET /api/gallery/image/{slug}/{uuid}.json` route — extend or sibling the existing image-serving endpoint (`src/pages/api/gallery/image/[slug]/[...file].ts` or equivalent) to serve `.json` files from the gallery-data directory with `Content-Type: application/json`

**Checkpoint**: Download a submission JSON; confirm `top`/`bottom` arrays match mosaic dimensions; `plates` array non-empty; `parts` array sums to mosaic visible area piece count.

---

## Phase 8: User Story 6 — Expanded Gallery Admin Controls (Priority: P6)

**Goal**: Admin overlay has 4 icon buttons per cubby (Move↑, Select□, Download↓, Delete✕); bulk action bar in header operates on selected faces; all controls have descriptive tooltips.

**Independent Test**: Quickstart Scenarios 4–7 — `?admin=true` shows 4 buttons; bulk select + move works; download fetches JSON; move-to-bottom wraps correctly.

**Depends on**: T003 (gallery list for Move dropdown), T005 (name in record), T020 (delete .json), T024 (JSON download endpoint)

- [X] T025 [US6] Add `moveSubmission(dataDir, uuid, fromSlug, toSlug): void` and `moveSubmissions(dataDir, uuids, fromSlug, toSlug): { moved: string[]; failed: string[] }` to `src/lib/gallery/submissions.ts` — updates manifest entries; caller moves files
- [X] T026 [US6] Update `promoteSubmission()` in `src/lib/gallery/submissions.ts` — replace timestamp=0 approach with a position-aware 3-state reorder: (state 1) not at top of group → move to top of current group; (state 2) at top of group, not first overall → move to top of previous group; (state 3) absolute first → move to absolute last; return the action taken
- [X] T027 [US6] Create `src/pages/api/gallery/move.ts` — `POST { uuids, fromSlug, toSlug }` endpoint; validates both slugs exist; calls `moveSubmissions()`; moves PNG + JSON files via `fs.rename` (fallback copy+delete); returns `{ success, moved, failed }`
- [X] T028 [US6] Update `src/pages/api/gallery/promote.ts` — call updated `promoteSubmission()` that returns the action taken; return `{ success: true, action: 'moved-to-top' | 'moved-to-prev-group' | 'moved-to-bottom' }` in response
- [X] T029 [US6] Rework the admin overlay in `src/pages/[gallery].astro` — replace current 2-button layout with 4 buttons per occupied cubby: (a) upper-left green ↑ `.move-btn`; (b) upper-right grey `□` `.select-btn` (checkbox appearance); (c) lower-left blue ↓ `.download-btn`; (d) lower-right red ✕ `.delete-btn`; update `slotButtonPos` to compute all four corner positions
- [X] T030 [US6] Update move button click handler in `src/pages/[gallery].astro` inline script — POST to `/api/gallery/promote`; update button tooltip based on response `action` for the NEXT click (no reload needed for tooltip update; reload after action completes)
- [X] T031 [US6] Implement download button click handler in `src/pages/[gallery].astro` inline script — trigger `window.open` or `<a download>` pointing to `/api/gallery/image/{slug}/{uuid}.json`
- [X] T032 [US6] Implement select checkbox toggle in `src/pages/[gallery].astro` inline script — maintain `selected: Set<string>`; toggle uuid on click; update checkbox visual state; show/hide bulk action bar based on `selected.size > 0`
- [X] T033 [US6] Render bulk action bar in `src/pages/[gallery].astro` header (visible only when `selected.size > 0`) — show: "Select All" checkbox, "Clear" button, "Move to" gallery `<select>` + "Move" button, "Download" button, "Delete" button; style consistently with admin mode
- [X] T034 [US6] Wire bulk actions in `src/pages/[gallery].astro` inline script: (a) "Select All" adds all visible uuids; (b) "Clear" empties selection; (c) "Move" POSTs to `/api/gallery/move` with array of selected uuids; (d) "Download" triggers sequential downloads of JSON files for each selected uuid; (e) "Delete" confirms once then POSTs to `/api/gallery/delete` for each selected uuid sequentially; reload on completion
- [X] T035 [US6] Add `title` tooltips to all admin control buttons in `src/pages/[gallery].astro` — move button tooltip is dynamic (computed per-position: "Move to top", "Move to previous group", or "Move to bottom"); select: "Select"; download: "Download build data"; delete: "Delete this face"; bulk tooltips include count (e.g., "Move 3 faces to Hall of Nobles")

**Checkpoint**: Navigate to `/hall-of-faces?admin=true` with 2+ submissions; verify 4 buttons per face; select 2 faces; bulk bar appears; Move to Hall of Nobles succeeds; Download downloads JSON; Delete removes face; wrap-around move on top face moves it to bottom.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T036 [P] Run `pnpm test` — all unit tests pass (T007 plate-layout, T008 random-name)
- [X] T037 [P] Run `pnpm typecheck` (or `astro check`) — zero TypeScript errors across all modified files
- [ ] T038 Validate all 7 quickstart scenarios manually against the running dev server
- [X] T039 [P] Update `src/lib/gallery/submissions.ts` — remove `promoteSubmission()` timestamp=0 implementation (now superseded by 3-state logic in T026); keep function signature for backward compat as a thin wrapper
- [X] T040 [P] Delete legacy `{uuid}.csv` handling from submit/delete endpoints if any old CSV logic remains after T019/T020

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — baseline check
- **Phase 2 (Foundation)**: Depends on Phase 1 — blocks everything else
- **Phase 3–8 (Stories)**: All depend on Phase 2; can proceed in priority order or partially in parallel
- **Phase 9 (Polish)**: Depends on all story phases complete

### User Story Dependencies

| Story | Depends On (Phase 2 tasks) | Cross-Story Dependencies |
|---|---|---|
| US1 — Gallery Nav | T002, T003, T009 | None |
| US2 — Plate Preview | T004, T006, T007 | None |
| US3 — Named Sharing | T003, T005, T008 | None |
| US4 — Hover Name | T005 | US3 (name stored at submit time) |
| US5 — Enhanced Export | T004, T006 | US3 (JSON file structure established) |
| US6 — Admin Controls | T003, T005 | US3 (delete .json); US5 (download .json endpoint) |

### Parallel Opportunities

Within Phase 2, T003–T009 are all independent files and can run in parallel.

US1, US2, US3 have no cross-story dependencies — they can be worked in parallel after Phase 2.

US4 depends only on the `name` field being stored (US3 T019); US5 extends US3's JSON builder.

---

## Parallel Example: Phase 2 Foundation

```bash
# Can run simultaneously:
T003: src/lib/gallery/config.ts helpers
T004: src/types/index.ts plate types
T005: src/lib/gallery/submissions.ts name field
T006: src/lib/mosaic/plate-layout.ts algorithm
T007: tests/unit/plate-layout.test.ts
T008: src/lib/gallery/random-name.ts + test
T009: src/components/GalleryNav.astro

# Must run first (others depend on it):
T002: gallery-groups.json (T003 reads from it)
```

---

## Implementation Strategy

### MVP First (US1 only — visible in <1 hour)

1. Complete T001 (baseline check)
2. Complete T002 (gallery data)
3. Complete T003 (config helpers)
4. Complete T009 (GalleryNav component)
5. Complete T010, T011, T012 (US1 story tasks)
6. **STOP and VALIDATE**: All 5 galleries navigable from header; descriptions correct.

### Incremental Delivery

1. Phase 2 Foundation → all algorithms and types ready
2. US1 (Nav) → immediate visible value
3. US2 (Plate Preview) → generation page upgrade
4. US3 (Named Sharing) + US4 (Hover) → sharing and gallery improvements
5. US5 (Enhanced Export) → build data file complete
6. US6 (Admin Controls) → admin efficiency

---

## Notes

- `computePlateLayout` is a pure TypeScript function — no DOM, no fetch, runs in browser and Node environments. Test it with Vitest.
- The existing `derivePartsList()` in `src/lib/mosaic/parts-list.ts` is reused for the parts section of the JSON export; no changes needed to it.
- BrickLink part numbers for 1×1 plates are in `LegoColor.brickLinkColorId` — map to the canonical "3024" part number (1×1 plate) with the appropriate color.
- The `promoteSubmission()` timestamp=0 approach (just implemented in phase 006) is superseded entirely by the position-aware 3-state logic in T026. The old approach is replaced, not extended.
- Legacy CSV files in gallery-data are NOT deleted in this phase; they are simply no longer created or served. Old submissions without `.json` files will silently skip the download button action.
- Total: **40 tasks** across 9 phases.
