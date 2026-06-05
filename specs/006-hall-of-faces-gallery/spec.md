# Feature Specification: Phase 006 — Hall of Faces Gallery Pages

**Feature Branch**: `006-hall-of-faces-gallery`

**Created**: 2026-06-05

**Status**: Draft

**Input**: User description: "Let's create three galleries: a public one called 'Hall of Faces', a private one called 'Hall of Nobles', and an event-specific one called 'BrickCon 2026'. Each gallery is reachable as a direct subdirectory (e.g., faceplate.me/hall-of-faces). The gallery header matches the home page with the gallery name as title, a provided description as subtitle, and 'Add your face to this gallery' as the third link back to faceplate.me with a Hall parameter. Below the header: a series of Hall.JPEG copies with 0–6 submitted mosaics composited into cubbies (2 rows × 3 columns). Gallery submissions must persist across site rebuilds."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — View a Gallery Page (Priority: P1)

A visitor navigates directly to a gallery URL (e.g., `faceplate.me/hall-of-faces`) and sees the Hall of Faces gallery. The page shows the gallery name, its description, and a call-to-action link. Below the header, one or more composite images fill the page — each is a photograph of the physical Hall of Faces structure with up to six submitted face mosaics placed into the dark cubby alcoves (arranged in two rows of three). Unfilled cubbies show the dark alcove background. The gallery is always up to date with the latest submissions.

**Why this priority**: The gallery display is the primary visitor experience and must exist before submission flows can be validated end to end.

**Independent Test**: Navigate to `/hall-of-faces`. Verify the header matches the gallery name and description. Verify at least one Hall.JPEG composite appears. If submissions exist, verify they appear in the cubbies left-to-right, top-to-bottom. If no submissions exist, verify the Hall.JPEG still appears with all cubbies dark.

**Acceptance Scenarios**:

1. **Given** a visitor opens `/hall-of-faces`, **When** the page loads, **Then** the header shows "Hall of Faces" as the title, the gallery description as the subtitle, and "Add your face to this gallery ↗" as the third element.
2. **Given** the gallery has N submissions, **When** the page renders, **Then** `ceil(max(N,1) / 6)` Hall.JPEG composites are shown — each with up to 6 mosaics placed in cubbies in order, unfilled cubbies showing the bare alcove.
3. **Given** the gallery header's call-to-action link is clicked, **When** the user arrives at faceplate.me, **Then** the "Add to Group" field on the faceplate.me face-shaping sidebar is pre-filled with the gallery's slug (e.g., "hall-of-faces").
4. **Given** multiple Hall.JPEG composites are shown, **When** a viewer scrolls down, **Then** subsequent composites continue the submission sequence (composites 1, 2, 3… fill with mosaics 1–6, 7–12, 13–18…).

---

### User Story 2 — Browse All Three Galleries (Priority: P2)

The three galleries each have their own dedicated URL and independent content. Hall of Nobles is accessible only to visitors who know the direct URL or are given the link — it does not appear in any public index or navigation. BrickCon 2026 is accessible to attendees via a direct link distributed at the event.

**Why this priority**: Each gallery must be independently routable and independently populated; this confirms the routing and gallery-config model scales to multiple galleries.

**Independent Test**: Navigate to `/hall-of-faces`, `/hall-of-nobles`, and `/brickcon-2026` separately. Verify each shows its own name, description, and independent submission set. Verify `/hall-of-nobles` is not linked from any public page (header, footer, or home page navigation).

**Acceptance Scenarios**:

1. **Given** three galleries are configured, **When** `/hall-of-faces`, `/hall-of-nobles`, and `/brickcon-2026` are visited, **Then** each shows its own name, description, and submissions independently.
2. **Given** Hall of Nobles is configured as unlisted, **When** a visitor browses the public home page or Hall of Faces gallery, **Then** there is no link or mention of `/hall-of-nobles`.
3. **Given** a submission is made to "brickcon-2026," **When** the Hall of Faces gallery is viewed, **Then** the submitted mosaic does not appear there.

---

### User Story 3 — Submissions Survive a Rebuild (Priority: P3)

A site administrator rebuilds and redeploys the Faceplate site. All gallery submissions made before the rebuild remain visible on the gallery pages after redeployment — no submissions are lost.

**Why this priority**: The Phase 005 implementation stored submissions in the server filesystem inside the build output directory, which is overwritten on each deploy. This story ensures a persistence mechanism is in place before submissions accumulate.

**Independent Test**: Submit a mosaic to a gallery. Trigger a full site rebuild and redeploy. Navigate to the gallery page after redeployment. Verify the previously submitted mosaic is still present.

**Acceptance Scenarios**:

1. **Given** one or more mosaics have been submitted to a gallery, **When** the site is rebuilt and redeployed, **Then** all previously submitted mosaics are still displayed on the gallery page.
2. **Given** the site administrator redeploys, **When** they inspect the gallery pages, **Then** submissions made days or weeks prior are still present.

---

### Edge Cases

- What if a gallery has zero submissions? One Hall.JPEG is still displayed with all six cubbies dark (no placeholder text, just the empty alcove photograph).
- What if a gallery URL slug does not match any configured gallery? The page returns a "gallery not found" message rather than an error.
- What if Hall of Nobles is accessed by someone without the direct URL? There is no entry point — the page exists at its URL but is not linked or indexed by the site.
- What if a submission PNG is missing or corrupt? That cubby slot displays the dark alcove background, as if no submission had been made for that position.
- What if the same person submits multiple times to the same gallery? Each submission occupies a separate cubby slot in order of submission time.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Three gallery instances MUST be configured: "Hall of Faces" (`/hall-of-faces`, public), "Hall of Nobles" (`/hall-of-nobles`, unlisted), and "BrickCon 2026" (`/brickcon-2026`, public for attendees).
- **FR-002**: Each gallery MUST be reachable at a top-level URL slug (e.g., `/hall-of-faces`) with no `/gallery/` prefix. The Phase 005 `/gallery/{slug}` route MAY be retained as an alias or removed.
- **FR-003**: Each gallery page header MUST match the structural layout of the Faceplate home page header: gallery name as the page title, a gallery-specific description as the subtitle, and "Add your face to this gallery ↗" as the third element linking to `faceplate.me?hall={slug}`.
- **FR-004**: Gallery descriptions are site-administrator–provided text, unique per gallery, stored alongside the gallery configuration.
- **FR-005**: Hall of Nobles MUST NOT appear in any public-facing navigation, link, or index on the site. It is accessible only via its direct URL.
- **FR-006**: The gallery display MUST render one or more copies of `Hall.JPEG` (the 2-row × 3-column Hall of Faces photograph). Each copy accommodates exactly 6 submissions in the six cubby positions. Submissions fill positions left-to-right, top-to-bottom in order of submission timestamp.
- **FR-007**: Submitted face mosaics MUST be composited into the corresponding cubby alcoves in `Hall.JPEG` using client-side Canvas 2D — the same approach as the Phase 004/005 single-cubby overlay. Each submission PNG (already masked with the face boundary) is drawn at a calibrated position and scale into its cubby slot; shadow effects at mask edges are applied using Canvas gradients.
- **FR-008**: Cubby positions with no submission MUST show the bare dark-alcove background from the `Hall.JPEG` photograph.
- **FR-009**: Gallery submissions MUST be stored in a persistence layer that survives site rebuilds and redeployments. Submissions MUST NOT be stored only in the site's build output or ephemeral server filesystem. Gallery pages are server-rendered on every request so submissions appear immediately without a rebuild.
- **FR-010**: The faceplate.me main application MUST read a `hall` URL query parameter on page load. If present, the "Add to Group" group-name field MUST be pre-filled with the value of that parameter.
- **FR-011**: The position and scale of the mosaic composited into each cubby slot in `Hall.JPEG` MUST be calibrated per cubby (6 sets of coordinates), following the same empirical approach used for the single-cubby `Cubby.JPEG` overlay.

### Key Entities

- **Gallery**: A named, routed collection of submitted face mosaics. Attributes: slug (URL-safe, e.g., `hall-of-faces`), display name, description, visibility (public / unlisted).
- **GallerySlot**: One of the six cubby positions within a `Hall.JPEG` composite image. Attributes: row (0 or 1), column (0, 1, or 2), calibrated position and scale constants (analogous to `PLATE_X`, `PLATE_Y`, `PLATE_W`, `PLATE_H` in Phase 005).
- **GallerySubmission**: A submitted face mosaic assigned to a gallery. Attributes: gallery slug, submission timestamp, masked PNG image reference, unique identifier. Persisted externally from the build output.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All three gallery pages load within 3 seconds on a standard broadband connection, even with 12+ Hall.JPEG composites displayed.
- **SC-002**: A mosaic submitted to a gallery appears on the gallery page within 10 seconds of submission without a page reload.
- **SC-003**: Zero submissions are lost across a full site rebuild and redeploy cycle, verified over at least three consecutive rebuild cycles.
- **SC-004**: The "Add your face to this gallery" link on a gallery page correctly pre-fills the gallery name in the faceplate.me submission form 100% of the time.
- **SC-005**: The feature works correctly in the two most recent versions of Chrome, Firefox, and Safari on desktop.

---

## Clarifications

### Session 2026-06-05

- Q: Are gallery pages server-rendered on each request or statically generated? → A: Server-rendered on every request — the gallery always reflects the latest submissions; rebuilds do not affect gallery content.
- Q: Is Hall.JPEG mosaic compositing done server-side or client-side? → A: Client-side Canvas — the browser receives submission PNG URLs, loads Hall.JPEG and each PNG, and composites them using Canvas 2D (same approach as the Phase 004/005 single-cubby overlay).

## Assumptions

- `Hall.JPEG` (1923×1302 px, located at `public/images/Hall.JPEG`) is the official gallery background photograph. It contains 6 dark cubby alcoves arranged in 2 rows × 3 columns. Cubby positions and scales require empirical calibration (per FR-011); initial estimates are deferred to the planning phase.
- "Unlisted" for Hall of Nobles means no link to it appears anywhere on the public site — it is security-by-obscurity, not password-protected. The URL is kept private by the administrator.
- Gallery descriptions are short (1–3 sentences) and are provided by the administrator at configuration time, not by end users.
- Persistent storage for submissions uses a first-party server-side mechanism (e.g., persistent server volume, object storage, or database) that is not wiped on redeploy. The specific storage technology is a planning decision.
- The `hall` URL parameter on faceplate.me pre-fills the "Add to Group" field; the user may still edit it before submitting. No validation of the pre-filled value occurs until submission.
- Submission order within a gallery is determined by timestamp; the earliest submissions fill the lowest-numbered cubby positions (top-left first).
- Gallery pages are server-rendered on every request (Astro hybrid mode, already in use from Phase 005). The compositing runs in the browser via Canvas 2D; the server only provides the ordered list of submission PNG URLs.
- The Phase 005 `/gallery/{slug}` routing is superseded by this spec's top-level routing. The old stub page may be redirected or removed.
- The three initial galleries are: Hall of Faces (slug: `hall-of-faces`), Hall of Nobles (slug: `hall-of-nobles`), BrickCon 2026 (slug: `brickcon-2026`).
