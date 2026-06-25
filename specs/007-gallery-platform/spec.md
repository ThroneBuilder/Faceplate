# Feature Specification: Gallery Platform Expansion

**Feature Branch**: `007-gallery-platform`

**Created**: 2026-06-25

**Status**: Draft

**Input**: Multi-gallery management with public/restricted access, backing plate preview, enhanced sharing with name field and JSON export, gallery name hover, and expanded admin controls with bulk operations.

## Clarifications

### Session 2026-06-25

- Q: What do the "Top" and "Bottom" plate layers represent in the two-layer backing plate? → A: Top = front plate layer (LEGO tiles stud into it); Bottom = back support plate layer (offset for structural rigidity). Both layers span the full mosaic area.
- Q: What happens when Move-to-top is clicked on a face already at the absolute first position (top of group 1)? → A: Move the face to the absolute last position (bottom of the last group). The tooltip must reflect this — e.g., "Move to bottom" instead of "Move to top".

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Gallery Discovery & Navigation (Priority: P1)

A visitor to the site can see all available galleries in the header navigation, separated into "Public" and "Restricted" groupings, each shown as a clickable link to that gallery page. Each gallery page shows the gallery's name and description in its header.

**Why this priority**: Gallery discovery is the entry point for all other gallery activity. Without clear navigation, users cannot find or share to specific galleries.

**Independent Test**: Visiting the site shows a two-column gallery list in the header; clicking any link navigates to that gallery page and shows its name and description.

**Acceptance Scenarios**:

1. **Given** a visitor loads the home or any page, **When** they look at the header, **Then** they see two labeled groups: "Public" (Hall of Faces, BrickCon 2026) and "Restricted" (Hall of Nobles, Game of Thrones, Seattle Faces), each as a link.
2. **Given** a visitor clicks a gallery link, **When** the gallery page loads, **Then** the page header shows the gallery's display name and its description (e.g., "open sharing of face mosaics" for Hall of Faces).
3. **Given** a visitor is on a restricted gallery page, **When** they view the header, **Then** the gallery list still appears for navigation to other galleries.

---

### User Story 2 — Face Shaping with Backing Plate Preview (Priority: P2)

While a user shapes their face on the generation page, they see a live preview of the two-layer backing plate layout that would be needed to build their mosaic. The preview shows front and back plate arrangements as small diagrams beside the face shaping image, refreshing automatically as the face shape changes.

**Why this priority**: Knowing the plate layout during shaping helps users make informed decisions about complexity before committing to share.

**Independent Test**: Shaping the face on the generation page shows a plate diagram pair (front + back) that updates as the face mask changes.

**Acceptance Scenarios**:

1. **Given** a user is shaping their face, **When** they adjust the face shape, **Then** two small stacked diagrams appear to the right showing front and back plate layouts.
2. **Given** the plate layout is displayed, **When** a plate piece is at least 2 studs tall and 4 studs wide, **Then** its dimensions are shown inside (e.g., "2×4").
3. **Given** the plate layout is displayed, **When** the user adjusts the face size or shape, **Then** the plate diagrams refresh automatically within 1 second.
4. **Given** a plate piece is smaller than 2×4, **When** it appears in the diagram, **Then** it shows a border but no dimension label inside.

---

### User Story 3 — Named Sharing to Public Galleries (Priority: P3)

When a user submits their face mosaic to a gallery, they provide a name for their submission (which defaults to a randomly generated fun phrase). The share form only shows public galleries as destinations. The target gallery can be pre-selected via URL parameter.

**Why this priority**: Naming makes the gallery personal and searchable. Restricting to public galleries prevents accidental sharing to private collections.

**Independent Test**: The sharing form shows a pre-filled random name, only public galleries in the destination dropdown, and a gallery can be pre-selected via URL.

**Acceptance Scenarios**:

1. **Given** a user reaches the sharing step, **When** the form appears, **Then** a "Name" field is pre-filled with a randomly generated phrase (e.g., "awesome brick champion").
2. **Given** the sharing form is shown, **When** the user views the gallery selector, **Then** only public galleries (Hall of Faces, BrickCon 2026) appear as options.
3. **Given** the page URL contains `?gallery=brickcon-2026`, **When** the sharing form appears, **Then** "BrickCon 2026" is pre-selected as the destination.
4. **Given** the user clears the Name field and submits, **When** the form validates, **Then** submission is blocked and an error message prompts them to enter a name.
5. **Given** the URL gallery parameter references a restricted gallery, **When** the form loads, **Then** it falls back to the default public gallery (Hall of Faces).

---

### User Story 4 — Gallery Name Hover Display (Priority: P4)

On a gallery page, hovering over a mosaic image reveals the submitter's name as a tooltip.

**Why this priority**: Lightweight identity makes the gallery feel personal without cluttering the visual layout.

**Independent Test**: Hovering over any face mosaic in the gallery shows the submission name in a tooltip.

**Acceptance Scenarios**:

1. **Given** a gallery page is loaded and submissions are visible, **When** a user hovers over a mosaic image, **Then** a tooltip appears showing the name that was provided at submission time.
2. **Given** the tooltip is visible, **When** the user moves the cursor away, **Then** the tooltip disappears.

---

### User Story 5 — Enhanced Mosaic Data Export (Priority: P5)

When a face mosaic is submitted to a gallery, a structured data file is saved alongside the image containing all the information needed to physically build the mosaic: the submitter name, date, image parameters, the full color grid, the plate layout for both layers, and a parts list.

**Why this priority**: The data file is what makes a gallery submission actionable — without it, a builder cannot reproduce the mosaic from LEGO pieces.

**Independent Test**: After submitting a mosaic, a data file is retrievable that includes name, date, size, brightness, contrast, the color matrix, plate index maps for both layers, and a parts count table.

**Acceptance Scenarios**:

1. **Given** a user submits a mosaic, **When** the submission is saved, **Then** a structured data file (JSON recommended) is stored alongside the image.
2. **Given** the data file exists, **When** its contents are examined, **Then** it contains: Name, Date, Size, Brightness, Contrast, the full color matrix (rows × cols, with 0 for masked cells), the top plate index map, the bottom plate index map, and a parts list (piece name, part number, color, count).
3. **Given** a cell is outside the face mask, **When** it appears in any matrix field, **Then** its value is 0.

---

### User Story 6 — Expanded Gallery Admin Controls (Priority: P6)

In admin mode, each gallery cubby has four controls: move to top (green up-arrow), select for bulk action (grey checkbox), download data file (blue down-arrow), and delete (red X). The gallery page header in admin mode also shows bulk action controls that operate on all selected faces.

**Why this priority**: Admin efficiency requires both per-face and batch operations; the current single-delete control is insufficient for managing a growing gallery.

**Independent Test**: With `?admin=true` in the URL, each occupied cubby shows four icon buttons; clicking the checkbox on several faces enables the header bulk action bar; bulk operations apply to all checked faces.

**Acceptance Scenarios**:

1. **Given** the gallery is in admin mode, **When** a cubby contains a submission, **Then** four controls appear: green up-arrow (upper-left), grey checkbox (upper-right), blue down-arrow (lower-left), red X (lower-right).
2. **Given** a user clicks the green up-arrow on a face, **When** the face is already at the top of its group of 6, **Then** it is moved to the top of the previous group; otherwise it moves to the top of its current group.
3. **Given** a user clicks the grey checkbox, **When** it is unchecked, **Then** it toggles to checked (face is selected); clicking again unchecks it.
4. **Given** a user clicks the blue down-arrow, **When** the download begins, **Then** the structured data file for that face is downloaded to the user's device.
5. **Given** one or more faces are selected, **When** the user looks at the page header, **Then** a bulk action bar appears with: "All" toggle, "Clear" button, Move (with gallery dropdown), Download, Delete.
6. **Given** the user selects "Move" with a target gallery from the dropdown and confirms, **When** the operation completes, **Then** all selected faces move to the chosen gallery and disappear from the current view.
7. **Given** the user selects bulk Download, **When** the operation completes, **Then** all data files for selected faces are downloaded (as a zip or individually).
8. **Given** the user selects bulk Delete and confirms, **When** the operation completes, **Then** all selected faces are removed from the gallery.
9. **Given** the user hovers over any cubby control or bulk action icon, **When** the tooltip appears, **Then** it shows a descriptive label such as "Move to top", "Select", "Download", or "Delete 3 faces".

---

### Edge Cases

- What happens when a public gallery is empty and the user navigates to it? (Show empty state with invitation to share)
- What happens if the URL `?gallery=` parameter references a non-existent gallery? (Fall back to default public gallery)
- What happens if a user submits with no name (just spaces)? (Treat as empty; require a non-whitespace name)
- What happens during bulk Move if the destination gallery is the same as the source? (No-op with informational message)
- What happens if a backing plate data file is missing when the admin tries to download it? (Show error tooltip; skip silently in bulk download)
- What if the plate layout for a given face has no pieces larger than 2×4? (Show diagram with borders only, no labels)
- What happens when the admin clicks Move on a face already at the absolute first position? (Moves it to the absolute last position; tooltip shows "Move to bottom" to set this expectation before the click)

## Requirements *(mandatory)*

### Functional Requirements

**Gallery Structure**

- **FR-001**: The system MUST define five galleries: Hall of Faces (public), BrickCon 2026 (public), Hall of Nobles (restricted), Game of Thrones (restricted), Seattle Faces (restricted).
- **FR-002**: Each gallery definition MUST include: slug, display name, description, and a public/restricted flag.
- **FR-003**: Gallery descriptions for each gallery MUST be: Hall of Faces — "open sharing of face mosaics"; BrickCon 2026 — "crowd participation at Lego event"; Hall of Nobles — "Jeff's friends and family"; Game of Thrones — "Game of Thrones characters"; Seattle Faces — "Seattle celebrities".

**Header Navigation**

- **FR-004**: All pages MUST display a gallery navigation list in the header, split into two labeled groups: "Public" and "Restricted".
- **FR-005**: Each gallery in the navigation MUST be a clickable link to its gallery page.
- **FR-006**: Gallery pages MUST display the gallery's description in the page header.

**Backing Plate Preview**

- **FR-007**: The face shaping step MUST display two small stacked diagrams to the right of the shaping image showing front-layer and back-layer plate layouts.
- **FR-008**: The plate diagrams MUST update automatically whenever the face mask changes.
- **FR-009**: Each plate piece in the diagram MUST be shown with a visible border.
- **FR-010**: Plate pieces that are at least 2 studs tall AND at least 4 studs wide MUST display their dimensions inside the piece boundary (e.g., "2×4").

**Sharing Form**

- **FR-011**: The sharing form MUST include a required "Name" field.
- **FR-012**: The Name field MUST default to a randomly generated phrase in the format: [extreme adjective] + [brick adjective] + [fanatic noun] (e.g., "awesome brick champion").
- **FR-013**: Submission MUST be blocked if the Name field is empty or contains only whitespace.
- **FR-014**: The gallery selector on the sharing form MUST show only public galleries.
- **FR-015**: The default selected gallery MUST be Hall of Faces.
- **FR-016**: The `?gallery=` URL parameter MUST pre-select the matching public gallery; if the value is not a public gallery, the system MUST fall back to Hall of Faces.

**Gallery Hover Name**

- **FR-017**: Hovering over any gallery mosaic image MUST display a tooltip showing the submission name.

**Data Export File**

- **FR-018**: Each submission MUST be accompanied by a structured data file (JSON format) saved alongside the mosaic image.
- **FR-019**: The data file MUST contain: Name (string), Date (ISO 8601), Size (integer, 26–36), Brightness (integer), Contrast (integer), Mosaic (2D array of color IDs, 0 for masked), Top plate layer (2D array of plate indices for the front/tile-bearing layer, 0 for masked), Bottom plate layer (2D array of plate indices for the back/structural layer, 0 for masked), Parts list (array of objects with name, part number, color, count).

**Admin Cubby Controls**

- **FR-020**: In admin mode, each occupied cubby MUST show four icon buttons: green up-arrow (upper-left), grey checkbox (upper-right), blue down-arrow (lower-left), red X (lower-right).
- **FR-021**: The green up-arrow MUST move the face to the top of its current group of 6; if already at the top of a group but not the first group, it MUST move to the top of the previous group; if already the absolute first face in the gallery, it MUST move to the absolute last position (bottom of the last group). The button tooltip MUST update to reflect the action that will be taken: "Move to top" (normal), "Move to previous group" (at group top), or "Move to bottom" (at absolute first position).
- **FR-022**: The grey checkbox MUST toggle selection state for that face.
- **FR-023**: The blue down-arrow MUST trigger a download of that face's data file.
- **FR-024**: The red X MUST delete that face after confirmation (existing behavior, updated position/style to match new layout).
- **FR-025**: All four cubby controls MUST show a descriptive tooltip on hover.

**Admin Bulk Operations**

- **FR-026**: When one or more faces are selected, a bulk action bar MUST appear in the gallery page header.
- **FR-027**: The bulk action bar MUST include: Select All, Clear Selection, Move (with gallery destination dropdown), Download, Delete.
- **FR-028**: Bulk Move MUST relocate all selected faces to the chosen gallery; faces then disappear from the current gallery view.
- **FR-029**: Bulk Download MUST retrieve data files for all selected faces.
- **FR-030**: Bulk Delete MUST remove all selected faces after a single confirmation prompt.
- **FR-031**: All bulk action controls MUST show descriptive tooltips on hover (e.g., "Move 3 faces to Hall of Nobles").

### Key Entities

- **Gallery**: slug (unique identifier), display name, description, public flag; defines where submissions are stored and whether they are publicly accessible.
- **Submission**: uuid, gallery slug, submitter name, date, mosaic image file, data file; the core record of a shared face mosaic.
- **Data File**: JSON document per submission containing all parameters needed to physically reproduce the mosaic (dimensions, color grid, plate layouts, parts list).
- **Plate Layout**: Two-layer grid structure derived from the mosaic shape, decomposed into standard brick plate pieces. Top layer = front-facing plate (LEGO tiles stud into it); Bottom layer = back support plate (offset for structural rigidity). Both layers cover the full mosaic area.
- **BulkSelection**: Transient set of submission uuids currently checked for bulk action in admin mode.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All five galleries are navigable from any page header within 1 click, with public and restricted clearly distinguished.
- **SC-002**: The backing plate preview updates within 1 second of any face shape adjustment.
- **SC-003**: 100% of submissions include a non-empty Name and a valid data file saved alongside the mosaic image.
- **SC-004**: Gallery visitors can see submission names without leaving the gallery page (hover reveals name within 300ms).
- **SC-005**: An admin can select, move, download, or delete multiple faces in a single operation (bulk action) without performing individual actions per face.
- **SC-006**: Admin tooltips appear within 500ms of hover and accurately describe the count and target of the pending action.

## Assumptions

- The backing plate algorithm is computed from the current face mask without requiring user input beyond the mask shape.
- "Group of 6" in admin move behavior refers to the 6-slot batch displayed per page canvas, matching the existing `BATCH_SIZE = 6` implementation.
- Bulk download of multiple data files is acceptable as individual browser downloads (no server-side zip required for v1).
- The random name generator uses a fixed wordlist embedded in the client; no external service is called.
- "Restricted" is a navigation category label only — restricted galleries appear in the header nav under a "Restricted" group alongside the "Public" group. There is no authentication gate; all galleries are accessible by anyone who navigates to or knows the URL.
- The `?gallery=` URL parameter uses the gallery slug (e.g., `brickcon-2026`), not the display name.
- The parts list in the data file is derived from the plate layout decomposition computed at share time.
- Existing `?admin=true` URL mechanism is retained; no additional authentication is added in this phase.
- Gallery descriptions are defined in code, not editable via UI in this phase.
