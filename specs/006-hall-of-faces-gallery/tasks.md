# Tasks: Phase 006 — Hall of Faces Gallery Pages

**Input**: Design documents from `specs/006-hall-of-faces-gallery/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Organization**: Tasks grouped by user story. US1 = View Gallery Page, US2 = Browse All Three Galleries, US3 = Submissions Survive Rebuild.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no in-progress dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup

**Purpose**: Infrastructure changes shared by all three user stories.

- [x] T001 Update `gallery-groups.json` at repo root — replace `test-group` entry with the three production galleries (hall-of-faces, hall-of-nobles, brickcon-2026), each with `slug`, `displayName`, `description` (placeholder), and `visibility` fields per `data-model.md`
- [x] T002 [P] Add `gallery-data/` to `.gitignore` (local dev storage directory)
- [x] T003 [P] Create `src/lib/gallery/cubby-slots.ts` — export `HALL_W=1923`, `HALL_H=1302`, `HALL_MOSAIC_SCALE=0.10`, and `CUBBY_SLOTS` array with all 6 pre-calibrated entries (alcoveCx/alcoveCy per `data-model.md`); no logic, constants only

**Checkpoint**: `pnpm test` passes with new constants file present.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared server-side library used by all gallery API routes and the gallery page.

- [x] T004 Implement `readSubmissions(dataDir, slug)` and `appendSubmission(dataDir, record)` in `src/lib/gallery/submissions.ts` — `readSubmissions` reads `{dataDir}/submissions.json` (returns `[]` if absent), filters by `slug`, sorts by `timestamp` ascending; `appendSubmission` reads, appends one `SubmissionRecord`, writes back atomically — pure Node.js, no DOM; `SubmissionRecord` type per `data-model.md`
- [x] T005 [P] Unit tests for `src/lib/gallery/submissions.ts` in `tests/unit/gallery-submissions.test.ts` — 5 cases: read from missing file returns `[]`; read filters by slug; read sorts by timestamp; append writes correct record; two appends produce two records — depends on T004

**Checkpoint**: `pnpm test` passes including `gallery-submissions.test.ts`.

---

## Phase 3: User Story 1 — View a Gallery Page (Priority: P1) 🎯 MVP

**Goal**: Visiting `/hall-of-faces` renders a gallery page with the correct header and one or more Hall.JPEG canvas composites showing submitted mosaics in cubbies.

**Independent Test**: Navigate to `/hall-of-faces`. Verify: (1) `<h1>` shows "Hall of Faces", (2) subtitle is the configured description, (3) "Add your face to this gallery ↗" link points to `https://faceplate.me/?hall=hall-of-faces`, (4) at least one canvas element is present with `width=1923` and `height=1302`, (5) with one submission PNG, the canvas renders the PNG composited into slot 0 (top-left cubby).

### Implementation

- [x] T006 [P] [US1] Implement image-serving API route `src/pages/api/gallery/image/[slug]/[uuid].ts` — `export const prerender = false`; reads `{GALLERY_DATA_DIR}/{slug}/{uuid}.png`; validates slug against `gallery-groups.json`; streams file with `Content-Type: image/png`; returns 404 if not found — depends on T004
- [x] T007 [US1] Create SSR gallery page `src/pages/[gallery].astro` — `export const prerender = false`; reads `Astro.params.gallery`; looks up in `gallery-groups.json`; returns 404 for unknown slugs; calls `readSubmissions(GALLERY_DATA_DIR, slug)`; groups into batches of 6; renders header (h1 = displayName, p.tagline = description, a.more-info = "Add your face to this gallery ↗" linking to `faceplate.me?hall={slug}`); renders one `<canvas data-batch-index="N">` per batch; embeds `window.GALLERY_BATCHES` JSON with image URLs per batch — per `contracts/ui-state.md`; depends on T004, T006
- [x] T008 [US1] Create `public/scripts/gallery-composite.js` — reads `window.GALLERY_BATCHES`; loads `Hall.JPEG` from `/images/Hall.JPEG` (cached); for each batch finds canvas by `data-batch-index`; sets canvas `width=1923, height=1302`; draws Hall.JPEG background; for each non-null slot URL: loads PNG, computes `brickPx = Math.round(HALL_H * HALL_MOSAIC_SCALE / 32)` = 4, draws mosaic centred on `(alcoveCx, alcoveCy)` with shadow gradients matching Phase 005 approach (note: at brickPx=4 the shadow width is only 12px — shadows are optional if visually imperceptible); null slots: no fill; loads `CUBBY_SLOTS` and `HALL_MOSAIC_SCALE` from embedded constants — depends on T003, T007
- [x] T009 [US1] Add `<script src="/scripts/gallery-composite.js" defer></script>` to `src/pages/[gallery].astro` and embed `CUBBY_SLOTS` and `HALL_MOSAIC_SCALE` as `window.HALL_COMPOSITING_CONSTANTS` JSON for use by the script — depends on T007, T008
- [x] T010 [P] [US1] Add `?hall=` pre-fill to `src/pages/index.astro` init block — after `detectCameraSupport()` / `setAcqMode('idle')`, add: `const hallParam = new URLSearchParams(window.location.search).get('hall'); if (hallParam) groupNameInput.value = hallParam` — per `contracts/ui-state.md`; completes the header CTA round-trip (FR-010)

**Checkpoint**: `/hall-of-faces` loads, shows correct header, one Hall.JPEG canvas. With a test submission PNG in `gallery-data/hall-of-faces/`, the canvas renders it in slot 0. Navigating to `faceplate.me?hall=hall-of-faces` pre-fills the group name field.

---

## Phase 4: User Story 2 — Browse All Three Galleries (Priority: P2)

**Goal**: All three gallery slugs route correctly; Hall of Nobles is not linked from any public page; each gallery is independent.

**Independent Test**: (1) `/hall-of-faces`, `/hall-of-nobles`, `/brickcon-2026` each return 200 with their respective names; (2) `/unknown-gallery` returns 404; (3) HTML of `/hall-of-faces` and `/` contain no reference to "hall-of-nobles".

### Implementation

- [x] T011 [US2] Replace Phase 005 gallery stub `src/pages/gallery/[slug].astro` with a 301 redirect — `export const prerender = false`; `return Astro.redirect(\`/\${slug}\`, 301)` — per `contracts/ui-state.md`
- [x] T012 [US2] Verify and document that no page in `src/pages/` generates a link to `hall-of-nobles` or `Hall of Nobles` — search the codebase; if any reference is found, remove it; add a code comment in `[gallery].astro` noting that unlisted galleries must not appear in public navigation
- [x] T013 [US2] Update `src/pages/api/gallery/submit.ts` — change `redirectUrl` from `/gallery/${group.slug}` to `/${group.slug}`; update file path for PNG storage from `public/gallery/{slug}/` to `{GALLERY_DATA_DIR}/{slug}/`; append submission record to `{GALLERY_DATA_DIR}/submissions.json` using `appendSubmission` — depends on T004, T006

**Checkpoint**: All three `/[slug]` URLs return 200 with correct names. `/unknown` returns 404. `/gallery/hall-of-faces` redirects 301 to `/hall-of-faces`. Submit route writes to `GALLERY_DATA_DIR` and returns `redirectUrl: "/hall-of-faces"`.

---

## Phase 5: User Story 3 — Submissions Survive a Rebuild (Priority: P3)

**Goal**: Submissions stored outside the build output directory, read at SSR request time. A full `pnpm build` + server restart leaves gallery data intact.

**Independent Test**: (1) Submit a mosaic to `hall-of-faces`. (2) Run `pnpm build`. (3) Restart the server process. (4) Navigate to `/hall-of-faces`. (5) The submitted mosaic is still visible.

### Implementation

- [x] T014 [US3] Add `GALLERY_DATA_DIR` environment variable support — create `src/lib/gallery/config.ts` exporting `export const GALLERY_DATA_DIR = process.env.GALLERY_DATA_DIR ?? path.join(process.cwd(), 'gallery-data')`; update all server-side gallery code to use this import instead of hardcoded paths — depends on T004, T006, T012
- [x] T015 [US3] Add `.env.example` entry `GALLERY_DATA_DIR=/data/gallery` with comment explaining production vs dev usage; add `gallery-data/` to `.gitignore` if not already done (T002 covers this)
- [x] T016 [US3] Create `gallery-data/` directory locally and add a `gallery-data/.gitkeep` (so the directory structure is tracked even without data files) — depends on T013

**Checkpoint**: Run `pnpm build`. Confirm `gallery-data/` still exists with any test submissions. Restart dev server. Navigate to gallery — submissions still visible.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T017 [P] Run `pnpm test` — verify all 171+ existing tests pass plus new `gallery-submissions.test.ts` (target: 176+ tests)
- [ ] T018 Render debug overlay verification — temporarily add red `strokeRect` overlays at all 6 cubby positions using calibrated values; visually confirm alignment in browser; remove overlay code; commit final `CUBBY_SLOTS` values
- [ ] T019 Manual smoke test: (1) complete face-shaping on faceplate.me → click "Add to Group" with `hall-of-faces` → verify redirect to `/hall-of-faces` with mosaic in slot 0; (2) submit 7 mosaics → verify 2 Hall.JPEG composites appear; (3) click gallery's "Add your face" link → verify `groupNameInput` pre-filled; (4) run `pnpm build` → verify submissions survive; (5) confirm page loads within 3 s on broadband (SC-001)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — T002, T003 [P] with T001
- **Phase 2 (Foundational)**: T004 after Phase 1; T005 [P] with T004
- **Phase 3 (US1)**: T006 [P] after T004; T007 after T004+T006; T008 after T003+T007; T009 after T007+T008; T010 [P] after T009
- **Phase 4 (US2)**: T011 after Phase 3; T012 after Phase 3; T013 after T004+T006
- **Phase 5 (US3)**: T014 after T004+T006+T013; T015+T016 after T014
- **Phase 6 (Polish)**: After all story phases

### Parallel Opportunities

```bash
# Phase 1 — run simultaneously:
T001 (gallery-groups.json)  T002 (.gitignore)  T003 (cubby-slots.ts)

# Phase 2 — run simultaneously:
T004 (submissions.ts)  T005 (unit tests)

# Phase 3 — run simultaneously first:
T006 (image API)  [then T007 → T008 → T009 → T010 sequentially]

# Phase 6 — run simultaneously:
T017 (pnpm test)  T018 (debug overlay)
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 (gallery page + canvas compositing)
4. **STOP AND VALIDATE**: `/hall-of-faces` loads and composites mosaics from `gallery-data/`
5. Demo-ready milestone

### Incremental Delivery

1. Phases 1–3 → **MVP**: gallery page displays
2. Phase 4 → **US2**: all three galleries routed; redirect; submit updated
3. Phase 5 → **US3**: persistent storage confirmed across rebuilds
4. Phase 6 → verified, pre-fill wired, smoke tested

---

## Notes

- `GALLERY_DATA_DIR` env var must be set before any server-side gallery code runs; T013 centralises this
- The `[gallery].astro` page responds 404 for slugs not in `gallery-groups.json` — Hall of Nobles is only unlisted (not password-protected), so this 404 applies only to truly unknown slugs
- Canvas `width/height` attributes must be set to 1923×1302 in the JS (not CSS) to avoid bitmap scaling artifacts; CSS `width: 100%; height: auto` controls display size
- Phase 005's `test-group` is removed from `gallery-groups.json` in T001; any existing `test-group` submissions in `public/gallery/test-group/` are abandoned (no migration needed since there are no real submissions yet)
- `gallery-composite.js` is a standalone plain-JS file in `public/scripts/` (not an Astro component) so it can be loaded with a `<script src>` tag without Astro bundling
