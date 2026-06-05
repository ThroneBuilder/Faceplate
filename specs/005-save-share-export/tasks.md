# Tasks: Phase 005 — Save, Share, and Export

**Input**: Design documents from `specs/005-save-share-export/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on in-progress tasks)
- **[Story]**: Which user story this task belongs to
- File paths are relative to repository root

---

## Phase 1: Setup

**Purpose**: Add new dependencies and infrastructure required by all three user stories.

- [x] T001 Add `jszip` and `@astrojs/node` to `package.json` and run `pnpm install`; verify existing `pnpm test` still passes
- [x] T002 Switch `astro.config.mjs` to `output: 'hybrid'` and add `@astrojs/node` adapter with `mode: 'standalone'`; verify `pnpm build` succeeds
- [x] T003 Add `FaceMaskRow`, `SessionMetadata`, and `PersistedSession` interfaces to `src/types/index.ts` per `data-model.md` — no breaking changes to existing types
- [x] T004 [P] Inspect `src/data/lego-palette.json` and confirm `brickLinkColorId` and `studioColorId` are populated for all entries; document any missing values in a comment at the top of `contracts/pipeline-api.md`
- [x] T005 Create `gallery-groups.json` at repo root with an empty groups array: `{ "groups": [] }` — admin populates before gallery is used

**Checkpoint**: `pnpm test` passes, `pnpm build` succeeds with hybrid output.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: `SessionMetadata` type and the types it depends on must be defined before any user story can start. Also add `SessionMetadata` to `src/types/index.ts` (T003 above covers this).

**⚠️ CRITICAL**: All three user stories share `SessionMetadata`. Complete Phase 1 before proceeding.

- [x] T006 Add `GalleryResponse` and `GalleryErrorResponse` interfaces to `src/types/index.ts` per `data-model.md` — used by the gallery submit handler

**Checkpoint**: `pnpm test` passes with new types present.

---

## Phase 3: User Story 1 — Resume a Session (Priority: P1) 🎯 MVP

**Goal**: Auto-save session state after each significant action; restore it on page load. User returns to the page and picks up exactly where they left off.

**Independent Test**: Complete the full workflow (upload → crop → tune → confirm mosaic → shape face). Close the tab. Reopen the page. Verify the face-shaping step is shown with the original mosaic and mask intact, within 3 seconds.

### Implementation

- [x] T007 [P] [US1] Implement `serialiseSession`, `isExpired` pure functions in `src/lib/session/session-state.ts` — per `contracts/pipeline-api.md` and `data-model.md`; `SessionMetadata` version=1, `savedAt = Date.now()`, expiry = 30 days
- [x] T008 [P] [US1] Unit tests for `src/lib/session/session-state.ts` in `tests/unit/session-state.test.ts` — 4 cases: `serialiseSession` fields; `isExpired` fresh (false); `isExpired` expired (true); `isExpired` exactly 30 days (true) — per `quickstart.md`
- [x] T009 [US1] Implement `saveSession`, `loadSession`, `clearSession` in `src/lib/session/session-state.ts` — uses IndexedDB database `"faceplate"`, object store `"sessions"`, key `"faceplate-session"`; `loadSession` calls `isExpired` and deletes the record + returns null if expired — depends on T007
- [x] T010 [US1] Wire session auto-save into `src/pages/index.astro` — import `saveSession`, `clearSession`; call `saveSession` (no debounce) after `onCropConfirmed` and after `onFaceShapingStart` in the Confirm Mosaic handler; call `saveSession` debounced 1 s after `onMaskCellClicked` / after drag completes (pointer-up) in the mask drag handler; call `clearSession` in `resetDownstream()` — depends on T009
- [x] T011 [US1] Wire session restore into `src/pages/index.astro` — call `loadSession()` before `renderPhase(appState)` at page init; if session is present, reconstruct `appState` as `face-shaping` from `SessionMetadata` fields (rebuild `Mosaic` from `mosaicGrid`, rebuild `FaceMask` from `maskRows`, pass through crop/key); cache `session.imageBlob` for later use in download; call `renderPhase(appState)` — depends on T009, T010

**Checkpoint**: Auto-save and restore work end-to-end in the browser. `pnpm test` passes (including `session-state.test.ts`).

---

## Phase 4: User Story 2 — Download All Results (Priority: P2)

**Goal**: "Download" button produces a ZIP archive with all five files. Enabled at the face-shaping step.

**Independent Test**: With a completed face-shaping session, press "Download." Open the ZIP. Verify all five files exist and have correct content — `face-mosaic.png` is a transparent-background masked PNG; `bricklink-wanted.xml` is valid XML listing brick counts; `studio-model.ldr` contains one LDraw line per visible brick; `readme.md` mentions Faceplate.me.

### Implementation

- [x] T012 [P] [US2] Implement `generateBrickLinkXml(mosaic, mask, palette)` in `src/lib/export/bricklink-xml.ts` — groups visible cells by colour, counts quantities, produces BrickLink wanted-list XML per `contracts/pipeline-api.md`; omits colours with null `brickLinkColorId`; returns `{ xml, omittedColours }` — pure function, node-testable
- [x] T013 [P] [US2] Unit tests for `src/lib/export/bricklink-xml.ts` in `tests/unit/bricklink-xml.test.ts` — 5 cases: single colour; multiple colours; masked cells excluded; missing brickLinkColorId omitted; valid XML structure — per `contracts/pipeline-api.md`
- [x] T014 [P] [US2] Implement `generateStudioLdr(mosaic, mask, palette)` in `src/lib/export/studio-ldr.ts` — one LDraw line per visible cell using `studioColorId` (fallback 16); position `x = col×20, z = row×20`; header lines; returns `{ ldr, placeholderColours }` — pure function, node-testable
- [x] T015 [P] [US2] Unit tests for `src/lib/export/studio-ldr.ts` in `tests/unit/studio-ldr.test.ts` — 4 cases: single brick correct line; masked cells omitted; coordinate mapping (row 2 col 3 → x=60, z=40); missing studioColorId uses colour 16 — per `contracts/pipeline-api.md`
- [x] T016 [US2] Implement `renderFaceMosaicPng(mosaic, mask, palette, brickPx?)` in `src/lib/export/face-mosaic-png.ts` — Canvas 2D, `brickPx` default 10; `clearRect` full canvas first (transparent); `fillRect` each visible cell with brick colour; `canvas.toBlob('image/png')` — browser only, not node-testable — depends on T003
- [x] T017 [US2] Implement `downloadResultsZip(mosaic, mask, palette, originalImageBlob)` in `src/lib/export/download-zip.ts` — uses JSZip; calls `renderFaceMosaicPng`, `generateBrickLinkXml`, `generateStudioLdr`; adds `original-image.jpg` (convert Blob to ArrayBuffer); adds `readme.md` (static template referencing Faceplate.me and describing each file); `zip.generateAsync({type:'blob'})` → `URL.createObjectURL` → `<a download="faceplate-results.zip">` trigger — depends on T012, T014, T016
- [x] T018 [US2] Enable "Download" button in `src/components/FaceShapingSection.astro` (remove `disabled`); wire `downloadBtn` click handler in `src/pages/index.astro` — calls `downloadResultsZip(appState.mosaic, appState.mask, palette, sessionImageBlob)` when `appState.phase === 'face-shaping'` — depends on T017, T011

**Checkpoint**: `pnpm test` passes. Download ZIP works in browser — all five files present and valid.

---

## Phase 5: User Story 3 — Share to Hall of Faces Gallery (Priority: P3)

**Goal**: "Add to Group" submits the masked PNG to the gallery API, then redirects to the gallery page. Groups are admin-created; unrecognised group name is rejected.

**Independent Test**: With a completed face-shaping session, enter group name "test-group" (which must exist in `gallery-groups.json`), press "Add to Group." Verify the browser redirects to `/gallery/test-group` and the submission PNG is present on the server. Verify an unknown group name shows an error without redirecting.

### Implementation

- [x] T019 [P] [US3] Create `src/pages/gallery/[slug].astro` — placeholder stub page (content is deferred to a future spec); reads the `slug` param, shows "Gallery coming soon — [slug]" heading; purpose here is only to establish a valid redirect target URL so the submit flow has somewhere to redirect; full mosaic display in the gallery (US3 acceptance scenario 2) is out of scope for this phase
- [x] T020 [P] [US3] Create `gallery-groups.json` at repo root with one test group: `{ "groups": [{ "slug": "test-group", "displayName": "Test Group" }] }` — T005 created the empty file; this populates it for testing (admins add entries here for real groups)
- [x] T021 [US3] Implement `src/pages/api/gallery/submit.ts` Astro API route — `export const prerender = false`; parses `multipart/form-data` request (`group_name`, `mosaic` file ≤2 MB); reads `gallery-groups.json` to validate group slug; writes PNG to `public/gallery/{slug}/{uuid}.png`; returns JSON `{ success: true, redirectUrl: '/gallery/{slug}' }` on success or `{ success: false, error: '...' }` on failure — per `contracts/pipeline-api.md` — depends on T002 (hybrid mode)
- [x] T022 [US3] Enable "Add to Group" button and text input in `src/components/FaceShapingSection.astro` (remove `disabled`); wire submit handler in `src/pages/index.astro` — validates non-empty group name; calls `renderFaceMosaicPng` to get PNG Blob; builds `FormData`; `fetch('/api/gallery/submit', ...)`; on success redirects via `window.location.href`; on failure shows inline error message below the text input — depends on T016, T021

**Checkpoint**: Submit with known group → redirect to gallery page. Submit with unknown group → inline error. `pnpm build` + deploy on Render.com succeeds.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T023 [P] Run `pnpm test` — verify all existing 156+ tests pass plus new `session-state.test.ts`, `bricklink-xml.test.ts`, `studio-ldr.test.ts` (target: 170+ tests)
- [ ] T024 — deferred to post-merge manual QA Manually verify session persistence in Chrome and Safari: complete workflow → close tab → reopen → confirm app resumes at face-shaping step within 3 seconds with mosaic and mask intact (SC-001)
- [ ] T025 — deferred to post-merge manual QA Manually verify Download ZIP in Chrome and Safari: open `face-mosaic.png` in an image viewer (confirm transparent background + brick colours), import `bricklink-wanted.xml` into BrickLink Wanted List (confirm no parse errors), open `studio-model.ldr` in BrickLink Studio (confirm flat plate grid renders), and read `readme.md` (confirm Faceplate.me link present) — SC-002, SC-004
- [x] T026 [P] Add `public/gallery/.gitkeep` so the gallery directory is tracked; add `public/gallery/**/*.png` to `.gitignore` so submitted mosaics are not committed to the repo

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately; T004 [P] with others
- **Phase 2 (Foundational)**: Depends on Phase 1 (T003)
- **Phase 3 (US1)**: T007+T008 [P] after Phase 2; T009 after T007; T010–T011 after T009
- **Phase 4 (US2)**: T012–T015 [P] after Phase 2; T016 after T003; T017 after T012+T014+T016; T018 after T017+T011
- **Phase 5 (US3)**: T019+T020 [P] after Phase 1; T021 after T002+T019+T020; T022 after T016+T021
- **Phase 6 (Polish)**: After all story phases complete

### Parallel Opportunities

```bash
# Phase 1 — run together:
T001 (install deps)  T003 (types)  T004 (palette check)  T005 (gallery-groups.json)

# Phase 3 — run together first:
T007 (serialiseSession)  T008 (session tests)

# Phase 4 — run together:
T012 (BrickLink XML)  T013 (BrickLink tests)
T014 (Studio LDR)     T015 (LDR tests)

# Phase 5 — run together:
T019 (gallery page stub)  T020 (update gallery-groups.json)
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Complete Phase 1: Setup (install deps, types)
2. Complete Phase 2: Foundational (GalleryResponse type)
3. Complete Phase 3: User Story 1 (session save + restore)
4. **STOP AND VALIDATE**: Close tab → reopen → session restores to face-shaping step
5. Demo-ready milestone — returning users retain their work

### Incremental Delivery

1. Phase 1–3 → **MVP**: Session persistence
2. Phase 4 → **US2**: Download ZIP with all five files
3. Phase 5 → **US3**: Gallery share + redirect
4. Phase 6 → hardened, cross-browser tested

---

## Notes

- `saveSession` and `loadSession` use IndexedDB which is async — all callers must be async or use `.then()`; existing `renderPhase` is synchronous so session restore must complete before `renderPhase` is called at init
- `sessionImageBlob` (the stored image blob) must be cached in a module-level variable in `index.astro` when the session is restored, so `downloadResultsZip` can use it without re-reading IndexedDB
- T002 (Astro hybrid mode) MUST complete before T021 (API route) — hybrid mode is required for server-rendered API routes
- The `gallery-groups.json` admin workflow: to add a real group, edit the file and redeploy; no database or admin UI is required in this phase
- If `pnpm build` fails after switching to hybrid output, check that all pages that should remain static are not importing server-only modules
