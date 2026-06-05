# Feature Specification: Phase 005 — Save, Share, and Export

**Feature Branch**: `005-save-share-export`

**Created**: 2026-06-05

**Status**: Shipped (2026-06-05)

**Input**: User description: "Faceplate.me needs to save state in three ways: when users return to the page, allow users to download their results, and allow users to share into a predefined Hall of Faces gallery. The session state can be a 'faceplate-session.json' file containing the uploaded image and all choices through the UI saved as a session cookie. The sharing option minimally needs 'face-mosaic.gif' or 'face-mosaic.png' a masked version of the mosaic rendering, as used in the current cubby overlay and in a later spec. The download option can be a ZIP file wrapping those, plus 'original-image.jpg', 'bricklink-wanted.xml' and 'studio-model.ldr' files with a 'readme.md' that links to the website and describes each file."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Resume a Session (Priority: P1)

A user who previously visited Faceplate.me and completed some or all of the workflow can return to the same browser and pick up exactly where they left off. Their uploaded image, crop settings, brightness/contrast/distance tuning choices, confirmed mosaic, and face-shaping mask are all restored automatically on page load — no re-upload or re-configuration needed.

**Why this priority**: Without session persistence, every page reload forces the user to restart from scratch. This is the highest-friction problem for returning users and blocks meaningful use of the download and share features (which require a completed session).

**Independent Test**: A tester can complete the full workflow (upload → crop → tune → confirm → shape), then close the browser tab, reopen it, and verify that the page resumes at the face-shaping step with all prior choices intact — including the visible mosaic, mask state, and candidate grid parameters.

**Acceptance Scenarios**:

1. **Given** a user has completed at least the crop step, **When** they reload or revisit the page in the same browser, **Then** the UI restores to the furthest completed step with all prior settings visible and interactive.
2. **Given** session data exists, **When** the page loads, **Then** restoration happens automatically without any user action.
3. **Given** session data exists but the stored image is no longer available (e.g., the cookie was cleared), **When** the page loads, **Then** the app starts fresh from the upload step with a clear indication that no prior session was found.
4. **Given** the user starts a new upload while session data is present, **When** they select a new image, **Then** the previous session is discarded and replaced with the new workflow from scratch.

---

### User Story 2 — Download All Results (Priority: P2)

After completing the face-shaping step, the user can press the "Download" button to receive a single ZIP archive containing everything they would need to build, order, and display their LEGO mosaic. The archive includes the masked mosaic image, their original photo, a BrickLink wanted-list file for ordering bricks, a Studio model file for visualisation, and a readme explaining each file and linking back to the website.

**Why this priority**: Download is the primary tangible deliverable of the Faceplate experience. It requires the session to be complete (P1) and produces a self-contained artifact the user keeps.

**Independent Test**: A tester with a completed face-shaping session can press "Download," open the resulting ZIP, and verify it contains all six expected files, each with correct content — the mosaic image matches what is shown on screen, the readme describes each file, and the BrickLink XML and Studio LDR are well-formed.

**Acceptance Scenarios**:

1. **Given** the user has completed face shaping, **When** they press "Download," **Then** a ZIP file is offered for download within 5 seconds.
2. **Given** the ZIP file is downloaded, **When** it is opened, **Then** it contains exactly: `face-mosaic.png`, `original-image.jpg`, `bricklink-wanted.xml`, `studio-model.ldr`, `readme.md`.
3. **Given** the ZIP's `face-mosaic.png`, **When** it is viewed, **Then** it shows the masked mosaic (transparent outside the face boundary, brick colours inside) matching the cubby overlay rendering.
4. **Given** the ZIP's `bricklink-wanted.xml`, **When** it is opened, **Then** it is a valid BrickLink wanted-list XML listing each unique brick colour and quantity required to build the mosaic.
5. **Given** the ZIP's `studio-model.ldr`, **When** it is opened, **Then** it is a valid LDraw-compatible model file representing the mosaic as a grid of 1×1 plates in the correct colours.
6. **Given** the ZIP's `readme.md`, **When** it is read, **Then** it describes each included file, links to Faceplate.me, and credits the project.

---

### User Story 3 — Share to Hall of Faces Gallery (Priority: P3)

After completing face shaping, the user can press "Add to Group" and enter a group name to submit their face mosaic to a predefined Hall of Faces gallery. The submission requires only the masked mosaic image. The group name associates the submission with a named collection (e.g., a family, organisation, or event).

**Why this priority**: Gallery sharing is a social feature that extends reach but depends on both the completed session (P1) and the exported mosaic image (P2). It is the lowest-priority item because it requires server-side infrastructure that the download path does not.

**Independent Test**: A tester with a completed face-shaping session can press "Add to Group," enter a group name, submit, and verify that the mosaic image appears in the Hall of Faces gallery under the specified group.

**Acceptance Scenarios**:

1. **Given** the user has completed face shaping, **When** they enter a group name and press "Add to Group," **Then** their masked mosaic image is submitted to the gallery and the app redirects them to the Hall of Faces gallery page showing their submission in the correct group.
2. **Given** the redirect occurs, **When** the gallery page loads, **Then** the submitted mosaic is visible within the specified group.
3. **Given** the user submits without entering a group name, **When** they press "Add to Group," **Then** they are prompted to enter a group name before submission proceeds.
4. **Given** the gallery submission fails (e.g., network error), **When** the failure occurs, **Then** the user sees a clear error message and can retry without losing their session.
5. **Given** the user's image is submitted, **When** it arrives at the gallery, **Then** no original (unmasked) image data is transmitted — only the masked mosaic rendering.

---

### Edge Cases

- What if the session cookie is too large for the browser limit (~4 KB)? The session JSON stores the image as a data URI or object URL reference; if storage size is a concern, the image reference may fall back to a compressed thumbnail or a pointer. The full image is kept in-memory for the active session.
- What if the user downloads before completing face shaping? The "Download" button is enabled only after face shaping is reached; it remains disabled at earlier steps.
- What if the Studio LDR or BrickLink XML generation fails? The ZIP is offered with the successfully generated files; the failing file is omitted and the readme notes its absence with an explanation.
- What if the user enters a group name that does not match any admin-created group? The submission is rejected with a clear message: "Group not found — check the group name and try again." No new group is created by the submission.
- What if the user is offline when pressing "Add to Group"? A clear offline error is shown; the session data is preserved so the user can retry when connectivity returns.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST automatically save the current session state after each significant user action (crop confirmed, mosaic confirmed, mask adjusted) without any explicit user action. Saved state expires 30 days after the last save; expired state is treated as absent.
- **FR-002**: On page load, the app MUST detect and restore any saved session automatically, resuming at the furthest completed step.
- **FR-003**: Session state MUST include: the uploaded image, crop parameters, brick height selection, candidate grid settings (brightness, contrast, distance, center key), the confirmed mosaic grid, and the face mask.
- **FR-004**: Session state MUST be stored entirely within the user's browser with no image data transmitted to any server as part of session saving.
- **FR-005**: The "Download" button MUST produce a ZIP archive containing `face-mosaic.png`, `original-image.jpg`, `bricklink-wanted.xml`, `studio-model.ldr`, and `readme.md`.
- **FR-006**: `face-mosaic.png` MUST render the confirmed mosaic with the face mask applied — pixels outside the mask boundary are transparent, pixels inside show the brick colours as used in the cubby overlay.
- **FR-007**: `bricklink-wanted.xml` MUST list every unique brick colour and the total quantity required, in a format directly importable into BrickLink's wanted-list system.
- **FR-008**: `studio-model.ldr` MUST represent the mosaic as a grid of 1×1 LEGO plates in LDraw format, one plate per mosaic brick, positioned in a flat grid.
- **FR-009**: `readme.md` MUST describe each file in the ZIP, state that all image processing occurred in the user's browser, and link to Faceplate.me.
- **FR-010**: The "Add to Group" submission MUST transmit only the masked mosaic image (`face-mosaic.png` equivalent) — no original image, no pixel data beyond the masked rendering.
- **FR-011**: Groups MUST be pre-created by a site administrator; users cannot create new groups through the UI. The "Add to Group" text field accepts a group name that is validated against existing admin-created groups at submission time.
- **FR-012**: If the submitted group name does not match any existing group, the submission MUST be rejected with a human-readable error message; no new group is created.
- **FR-013**: On successful gallery submission, the app MUST redirect the user to the Hall of Faces gallery page displaying their submitted mosaic in the correct group. On failure, a retryable error message is shown in place of a redirect.

### Key Entities

- **SessionState**: The complete user journey snapshot. Attributes: image data (blob or data URI), crop geometry, brick height, candidate key (brightness/contrast offsets), distance setting, confirmed mosaic grid, face mask (per-row left/right columns). Stored in browser storage; never transmitted to a server.
- **DownloadPackage**: The ZIP archive produced on demand. Contents: face-mosaic.png, original-image.jpg, bricklink-wanted.xml, studio-model.ldr, readme.md. Generated entirely client-side at the moment of download.
- **GallerySubmission**: The payload sent to the Hall of Faces gallery. Contains: group name, masked mosaic image (PNG). Does NOT contain the original image or any unmasked pixel data.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Session restoration completes within 3 seconds of page load when session data is present, with no user action required.
- **SC-002**: The Download ZIP is ready for the browser's download dialog within 5 seconds of the user pressing "Download," for a standard 32×32 mosaic.
- **SC-003**: At least 80% of users who complete face shaping successfully download or share their mosaic in the same session, as measured over the first month after launch.
- **SC-004**: The BrickLink XML and Studio LDR files open without errors in their respective applications for 100% of generated mosaics.
- **SC-005**: Gallery submissions succeed on first attempt for at least 95% of users with a working internet connection.
- **SC-006**: No original image pixel data appears in any network request — verifiable by browser network inspection during a share action.

---

## Clarifications

### Session 2026-06-05

- Q: What access control governs gallery group submission? → A: Admin-created groups only — groups must be pre-created by a site administrator; users cannot create groups through the UI; submitting to a non-existent group name is rejected.
- Q: How long does saved session state persist? → A: 30 days from last activity; expired state is treated as absent and the app starts fresh.
- Q: What UX follows a successful gallery submission? → A: Redirect to the Hall of Faces gallery page showing the submission in the correct group.
- Q: Are BrickLink and Studio colour IDs available in the existing palette data? → A: Yes — all 34 palette entries were populated during implementation using BrickLink's official colour guide (ID column → `brickLinkColorId`; LEGO colour number → `studioColorId`). No colours are omitted from the XML or fall back to placeholder colour 16 in the LDR.

## Assumptions

- Session storage uses IndexedDB (not `document.cookie`); the spec's reference to "session cookie" is interpreted as browser-side persistence generally. Cookies are limited to ~4 KB; IndexedDB handles the image blob natively.
- The BrickLink wanted-list XML format follows the BrickLink standard (`<INVENTORY><ITEM>…</ITEM></INVENTORY>`) using BrickLink colour IDs (`brickLinkColorId`) from the palette.
- The Studio LDR format follows LDraw conventions: one `1 <colour> x y z 1 0 0 0 1 0 0 0 1 3024.dat` line per brick (part 3024 = 1×1 plate), laid out in a flat grid at y=0.
- LEGO system colour IDs (used as `studioColorId`) map correctly to BrickLink Studio's colour display.
- The masked mosaic PNG is generated client-side using the same Canvas 2D rendering used for the cubby overlay, with transparency for masked cells.
- Gallery sharing requires a server endpoint (first-party, stateless per the constitution) to accept and store the masked PNG and group name. No image data beyond the masked PNG is transmitted.
- The "Hall of Faces gallery" is a simple, predefined collection — no user accounts, moderation queue, or per-user ownership in this phase.
- ZIP generation is performed entirely client-side using a JavaScript ZIP library (e.g., JSZip), adding no server dependency for the download path.
- The `readme.md` file includes: a brief description of each file, a privacy statement confirming client-side-only processing, and a link to Faceplate.me.
