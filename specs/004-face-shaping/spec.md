# Feature Specification: Phase 004 — Face Shaping

**Feature Branch**: `004-face-shaping`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "Implement the horizontal cropping now, which I'll call face shaping. After 'confirm mosaic' but before export, present the user two images side-by side: an interactive mosaic for trimming the face edges and a projection of the masked mosaic onto an image of a Hall of Faces cubby to '/public/images/Cubby.JPEG'. Text above should say 'Shape your face'. Clicking on cells in the mosaic will mask all cells to the closest edge horizontally. If that cell was already masked, it becomes unmasked and vice-versa. The mask should be primed with a guess at the face boundary. Changes to the mask should be reflected in the cubby projection immediately. The Cubby.jpg image has a white 16x16 plate over which the mosaic should be placed, centered where that plate is centered. Add a shadow effect matching the face edge to the back bricks behind it. For now, remove any UI after this step."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — View the Face Shaping Step (Priority: P1)

After confirming the mosaic, the user immediately sees the "Shape your face" panel. The left side shows the full mosaic with a pre-computed mask already applied — masked cells are visually dimmed or hidden. The right side shows a live preview of how the masked mosaic will look when placed in the Hall of Faces cubby image. The mask is seeded from a best-guess face boundary derived from the original head-detection result.

**Why this priority**: Without the two-panel layout and initial mask, there is nothing for the user to interact with. This is the foundation for all subsequent interaction.

**Independent Test**: After clicking "Confirm Mosaic," a tester can verify that the "Shape your face" heading appears, the left panel shows the mosaic with some cells pre-dimmed at the edges, and the right panel shows the cubby image with the masked mosaic composited over the white plate area.

**Acceptance Scenarios**:

1. **Given** the user has confirmed a mosaic, **When** the face shaping step appears, **Then** the heading "Shape your face" is displayed above both panels.
2. **Given** the face shaping step is displayed, **When** the user views the left panel, **Then** the full mosaic is shown at brick-level resolution with the initial face boundary mask applied (edge cells outside the face boundary are visually masked).
3. **Given** the face shaping step is displayed, **When** the user views the right panel, **Then** the masked mosaic is composited onto the cubby image, centered over the white 16×16 plate area, with masked cells absent and the surrounding cubby visible behind them.
4. **Given** the initial mask is applied, **When** the user views it, **Then** the mask approximates the face silhouette from the earlier head-detection step — columns near the left and right edges that fall outside the detected face boundary are masked by default.

---

### User Story 2 — Adjust the Face Mask by Clicking (Priority: P2)

The user refines the mask by clicking individual cells in the interactive mosaic. Each click masks or unmasks all cells in that row from the clicked cell to the nearest horizontal edge (left or right). If the clicked cell was already masked, clicking it unmasks that same range instead. The cubby projection updates immediately with every click — no separate "apply" step.

**Why this priority**: The click-to-trim interaction is the core sculpting mechanism. It allows the user to dial in the face boundary without needing to manually toggle individual cells.

**Independent Test**: A tester can click a cell near the left edge of the mosaic, observe that all cells in that row from the clicked cell to the left edge become masked, then click the same cell again to restore them.

**Acceptance Scenarios**:

1. **Given** the face shaping mosaic is displayed, **When** the user clicks a cell, **Then** all cells in that row from the clicked cell to the nearest horizontal edge (determined by which of left or right is fewer columns away) become masked.
2. **Given** a row already has cells masked to a given column by a prior click, **When** the user clicks the outermost masked cell in that row on the same edge, **Then** those cells are unmasked (the mask edge retreats back by one step for that row).
3. **Given** any mask change, **When** the mask updates, **Then** the cubby projection on the right panel reflects the new mask shape without any user action beyond the click.
4. **Given** the user clicks the center cell (index 4 in a 9-wide mosaic), **When** left and right distances are equal, **Then** the click defaults to masking toward the left edge.

---

### User Story 3 — Cubby Projection with Shadow (Priority: P3)

The right panel composites the masked mosaic onto the Hall of Faces cubby photograph. The mosaic is scaled to fit the white 16×16 plate area in the photograph, centered on it. Cells that are masked appear absent (transparent), allowing the cubby background to show through. A shadow is rendered on the cubby surface at the face boundary edges — where the mosaic ends and the background resumes — to give the projection realistic depth.

**Why this priority**: The shadow and projection quality affect how realistically the mosaic appears placed in the physical cubby, which is the primary visual payoff of the face shaping step.

**Independent Test**: A tester can verify that (1) the mosaic is visually centered over the white plate in the cubby image, (2) masked cells show the cubby background rather than mosaic bricks, and (3) a visible shadow is present along the vertical edge(s) where the face mask meets the background.

**Acceptance Scenarios**:

1. **Given** the cubby projection is displayed, **When** the user views it, **Then** the mosaic is centered over the white 16×16 plate area in `Cubby.JPEG`, scaled to match the plate's dimensions in the photograph.
2. **Given** the masked mosaic is composited onto the cubby, **When** a cell is masked, **Then** the cubby background is visible through that cell position rather than a brick color.
3. **Given** the masked mosaic has a face-shaped silhouette, **When** the projection is rendered, **Then** a shadow appears on the cubby surface behind the mosaic bricks at the boundary between the face edge and the masked area, consistent with the shape of the face mask.
4. **Given** the face mask changes, **When** the cubby projection updates, **Then** the shadow also updates to match the new mask boundary.

---

### Edge Cases

- What happens when all cells in a row are already masked and the user clicks one? The click unmasks that row's cells from the clicked position back to the nearest edge (the mask retreats).
- What happens if the detected face boundary results in a mask that covers most of the mosaic (very narrow face)? The initial mask is applied as-is; the user can widen it by clicking near the center.
- What happens if the mosaic width is narrower than 16 bricks? The mosaic is scaled up to fill the plate width; the aspect ratio is maintained.
- What happens if the mosaic width is wider than 16 bricks (from a very wide crop)? The mosaic is scaled down to fit within the plate area while maintaining aspect ratio.
- What happens if the user clicks a cell that is at the center column (equidistant from both edges)? The mask defaults to the left edge.
- What happens if `Cubby.JPEG` cannot be loaded? A placeholder background (neutral grey) is shown instead; the masking interaction continues to work.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The face shaping step MUST appear immediately after the user confirms the mosaic and MUST display the heading "Shape your face."
- **FR-002**: The face shaping view MUST present two panels side by side: an interactive masked mosaic on the left and a cubby projection preview on the right.
- **FR-003**: The interactive mosaic MUST be displayed at brick-level resolution with each cell individually clickable.
- **FR-004**: The mask MUST be initialized automatically with a best-guess face boundary derived from the head-detection data captured during the crop step, masking columns outside the detected face region on each row.
- **FR-005**: Clicking an unmasked cell MUST mask all cells in that row from the clicked cell to the nearest horizontal edge (left or right, whichever requires fewer columns).
- **FR-006**: Clicking a cell that was already masked (at the masked boundary) MUST unmask that row's cells — retreating the mask edge by one step for that row.
- **FR-007**: Mask changes MUST be reflected in the cubby projection immediately, without any additional user action.
- **FR-008**: The cubby projection MUST composite the masked mosaic onto `Cubby.JPEG`, centered over the white 16×16 plate area in the photograph.
- **FR-009**: Cells that are masked MUST appear absent in the cubby projection, showing the cubby background through their positions.
- **FR-010**: A shadow effect MUST be rendered on the cubby surface at the boundary between the face-shaped mosaic and the masked (absent) area, reflecting the shape of the face mask.
- **FR-011**: No UI elements beyond the face shaping step MUST be presented in this phase (export and downstream steps are out of scope).

### Key Entities

- **FaceMask**: A per-row data structure recording the left and right trim column boundaries for each row of the mosaic. Each row stores (leftVisibleCol, rightVisibleCol) indicating which cells are unmasked. Initialized from the head-detection face bounds; modified by user clicks.
- **CubbyProjection**: A composite image combining `Cubby.JPEG` with the masked mosaic scaled and centered over the white plate area, including a rendered shadow at the face boundary edges.
- **PlateRegion**: The bounding box of the white 16×16 plate within `Cubby.JPEG`, expressed in image pixels, used to position and scale the mosaic overlay.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The face shaping panel appears within 500 milliseconds of the user clicking "Confirm Mosaic," with the initial mask already applied.
- **SC-002**: The cubby projection updates within 100 milliseconds of any mask change — imperceptible lag between clicking a cell and seeing the result.
- **SC-003**: The initial mask is correct (matches actual face boundary) for at least 80% of standard portrait photos without any user adjustment, as assessed in user observation sessions.
- **SC-004**: Users can sculpt the face to their satisfaction in 5 or fewer clicks for at least 70% of portrait photos.
- **SC-005**: The feature works correctly in the two most recent versions of Chrome, Firefox, and Safari on desktop.

---

## Assumptions

- The head-detection bounds from the crop step (Phase 1C) are accessible in the confirmed mosaic state and can seed the initial mask. The initial mask converts the face oval/rectangle from pixel coordinates to brick columns per row.
- The white 16×16 plate in `Cubby.JPEG` is at a fixed, known pixel position and size. These coordinates will be determined empirically by measuring the photograph and hardcoded as constants in the implementation.
- The mosaic is scaled (up or down) to fit within the plate area while maintaining its aspect ratio. Any remaining plate area not covered by the mosaic shows the cubby background.
- The shadow effect is a directional soft shadow applied only to the exposed cubby surface at the face-mask edges (left and right vertical boundaries), not to the top or bottom.
- Masked cells are represented as fully transparent in the mosaic overlay; no partial masking or feathering is applied to individual cells.
- The mask operates column-by-column within each row (per-row left and right trim). There is no per-cell toggle — clicks always set or clear the boundary for an entire edge segment of a row.
- "For now, remove any UI after this step" means no export, share, or continuation button is included in this feature; the face shaping view is the terminal screen in this phase.
- The mosaic confirmed from Phase 2A/2B carries all data needed for this step: the brick grid, brick height, width, and the original crop's head bounds.
