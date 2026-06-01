# Feature Specification: Phase 2A/2B — Mosaic Candidate Grid and Iterative Selection

**Feature Branch**: `003-mosaic-candidates`

**Created**: 2026-05-31

**Status**: Draft

**Input**: User description: "Generate nine mosaic candidates in a 3×3 grid using a brightness×contrast binary search, allow iterative selection and narrowing, show a history of chosen candidates, support fast revert via cache, and confirm the final choice."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — View Initial Nine Candidates (Priority: P1)

Immediately after the user confirms the crop, the page reveals a 3×3 grid of nine mosaic previews. The center candidate is generated at the default brightness/contrast (no adjustment). The eight surrounding candidates span the initial search space at two-thirds of the range in each direction. A history strip below the grid shows the default candidate as the first and only chosen entry.

**Why this priority**: Candidate generation is the primary deliverable of this feature. Without it, none of the iterative selection or confirmation flows are possible. The grid must appear and be interactive before anything else.

**Independent Test**: A tester can confirm a crop and verify that nine distinct mosaic thumbnails appear in a 3×3 layout within 3 seconds, that the center cell is the default (no adjustment), and that the surrounding eight cells visually differ from the center in brightness and/or contrast.

**Acceptance Scenarios**:

1. **Given** the user has confirmed a crop, **When** the candidate grid loads, **Then** nine mosaic previews are displayed in a 3×3 grid with the no-adjustment candidate at the center position.
2. **Given** the candidate grid has loaded, **When** the user views it, **Then** all nine candidates are distinct and reflect the brightness and contrast settings used to generate them.
3. **Given** the candidate grid has loaded, **When** the user views the history strip, **Then** the default candidate appears as the first (and only) item in the history. (The history strip is fully interactive after US2 is complete; in the MVP it renders as a placeholder showing the default entry.)
4. **Given** the system is generating the initial nine candidates, **When** generation is in progress, **Then** a visible loading state is shown for each pending cell; each cell becomes interactive as its individual generation completes (progressive activation).

---

### User Story 2 — Iterate by Selecting a Grid Candidate (Priority: P2)

The user clicks any of the nine grid cells to select that candidate. The selected candidate is added to the history strip as the new most-recent entry. The grid regenerates with the selected candidate at the center and eight new candidates around it at half the previous search spacing. The user can continue selecting to refine further.

**Why this priority**: Iterative selection is the core interaction loop. It depends on the initial grid (US1) and is required before revert or confirm are meaningful.

**Independent Test**: A tester can click the top-right candidate in the initial grid, verify it is added to the history strip, and verify that the new grid is centered on that candidate with the surrounding eight candidates at half the previous spacing (±33 instead of ±67 for the first iteration).

**Acceptance Scenarios**:

1. **Given** the candidate grid is displayed, **When** the user clicks a non-center candidate, **Then** that candidate becomes the center of a new grid, is added to the history strip as the most-recent choice, and eight new surrounding candidates are generated at half the previous step size.
2. **Given** the user has clicked a non-center candidate, **When** the new grid loads, **Then** the selected candidate is visually highlighted as the current center choice.
3. **Given** the user clicks the center candidate (current choice), **When** no change occurs, **Then** the grid and history remain unchanged (clicking the current choice has no effect).
4. **Given** the search space has narrowed over several iterations, **When** the step size would be less than 1, **Then** the surrounding eight candidates use a minimum step size of 1 and duplicate candidates are displayed identically without error.

---

### User Story 3 — Revert to a Prior Chosen Candidate (Priority: P3)

The user clicks any candidate in the history strip to revert to that earlier choice. The grid recenters on that candidate. Any history entries after the reverted-to entry remain visible in a de-emphasized state (they are not deleted). If the user then selects a new grid candidate, a new forward history branch is added after the revert point, replacing the de-emphasized entries from that point onward.

**Why this priority**: Revert enables non-destructive exploration. Users can compare multiple search paths without losing prior work. It depends on the history strip built in US1 and US2.

**Independent Test**: A tester can iterate forward to create a 4-entry history, click the second history entry to revert, verify the grid recenters on that candidate, verify entries 3 and 4 appear de-emphasized but visible, and then select a new grid candidate to verify the de-emphasized entries are replaced.

**Acceptance Scenarios**:

1. **Given** the history strip has multiple entries, **When** the user clicks a prior history entry, **Then** the candidate grid recenters on that candidate and the history entry is highlighted as the current choice.
2. **Given** the user has reverted to an earlier history entry, **When** the user views the history strip, **Then** history entries after the revert point are visible but visually de-emphasized (e.g., dimmed or greyed).
3. **Given** the user has reverted and then selects a new grid candidate, **When** the new selection is confirmed, **Then** the de-emphasized entries after the revert point are replaced by the new forward history entry.
4. **Given** the user reverts to a prior candidate, **When** the grid is shown, **Then** the mosaic appears instantaneously without re-generation (served from cache).

---

### User Story 4 — Confirm the Chosen Mosaic (Priority: P4)

When the user is satisfied, they click "Confirm Mosaic" to proceed with the most recently chosen candidate. The center grid cell, the most-recent history entry, and the Confirm Mosaic button are all connected by a blue highlight to make clear they represent the same choice. Clicking Confirm Mosaic ends the candidate selection phase.

**Why this priority**: Confirmation is the exit condition for this feature. It depends on all prior stories.

**Independent Test**: A tester can verify that after any iteration or revert, the center grid cell, the most-recent history entry, and the Confirm Mosaic button all display a consistent blue highlight, and that clicking the button proceeds to the next step.

**Acceptance Scenarios**:

1. **Given** a candidate has been chosen (at least one iteration), **When** the user views the screen, **Then** the center grid cell, the most-recent history entry, and the Confirm Mosaic button all share a consistent visual highlight (blue outline).
2. **Given** the Confirm Mosaic button is visible, **When** the user clicks it, **Then** the most-recently chosen candidate is passed to the next step and the candidate selection UI is no longer interactive.
3. **Given** the user has not yet made any selection beyond the default, **When** the user clicks Confirm Mosaic, **Then** the default (no-adjustment) candidate is confirmed.

---

### Edge Cases

- What happens when the search step size reaches or approaches zero? The system uses a minimum step of 1; when all 8 surrounding candidates would be identical to the center, the instructional text above the grid (normally explaining how to iterate) is replaced with a non-blocking notice ("Maximum refinement reached") and the Confirm Mosaic button remains available.
- What happens if candidate generation fails for one or more cells in the grid? The affected cells display a visible error state (e.g., a grey placeholder with a retry icon); the rest of the grid remains interactive.
- What happens when the user reverts all the way to the initial default candidate? The grid returns to the initial ±67 step size centered on (0, 0), and forward history is de-emphasized.
- What happens if the user rapidly clicks multiple candidates before generation completes? The system processes the last click and cancels any in-progress generation from earlier clicks; the grid shows a loading state.
- What happens when the adjusted brightness or contrast value would exceed the ±100 bounds? Candidate values are clamped at ±100 and the grid reflects the clamped values; the user is not shown an error.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The candidate grid MUST appear automatically below the crop section immediately after the user confirms the crop, without any additional user action.
- **FR-002**: The candidate grid MUST display exactly nine mosaic thumbnails in a 3×3 layout.
- **FR-003**: The center position of the 3×3 grid MUST always show the most-recently chosen candidate (the initial default, or a user-selected candidate).
- **FR-004**: The eight surrounding grid candidates MUST be generated using the most-recently chosen candidate's brightness and contrast as the center point, with candidates placed at ±step in each axis (B±step, C±step), producing a uniform grid.
- **FR-005**: The initial step size MUST be two-thirds of 100 (approximately 67), centered on brightness=0 and contrast=0 for the first iteration.
- **FR-006**: Each time the user selects a non-center grid candidate, the step size for the next grid MUST be half the current step size.
- **FR-007**: When the user clicks a non-center grid candidate, that candidate MUST be added to the history strip as the new most-recent entry, and the grid MUST regenerate centered on that candidate.
- **FR-008**: The history strip MUST display all previously chosen candidates in chronological order, scrollable if the number of entries exceeds the visible area.
- **FR-009**: Clicking any entry in the history strip MUST revert the grid to that candidate's brightness and contrast settings, highlighting it as the current choice.
- **FR-010**: After a revert, history entries that came after the reverted-to entry MUST remain visible in a de-emphasized state until the user makes a new grid selection.
- **FR-011**: After a revert, if the user makes a new grid selection, the de-emphasized forward history entries MUST be replaced by the new entry.
- **FR-012**: All previously generated mosaic candidates MUST be cached so that reverting to any prior choice displays the mosaic without re-generation.
- **FR-013**: While candidates are being generated, the grid MUST show a visible loading state; grid cells MUST NOT be interactive until generation is complete. The history strip MUST remain interactive during generation — clicking a history entry cancels any in-progress generation and immediately recenters the grid on the selected prior candidate (served from cache).
- **FR-014**: The center grid cell, the most-recent history entry, and the Confirm Mosaic button MUST share a consistent blue highlight that visually connects them as the current choice.
- **FR-015**: Clicking Confirm Mosaic MUST proceed with the most-recently chosen candidate and end the candidate selection interaction.
- **FR-016**: Candidate brightness and contrast values MUST be clamped to the range [−100, 100]; values outside this range are not generated.
- **FR-017**: If candidate generation fails for one or more grid cells, the affected cells MUST display a visible error state; the remaining interactive cells MUST remain usable.
- **FR-018**: If a server-side API is used for mosaic generation, the server MUST process the cropped image ephemerally and MUST NOT persist, log, or forward image data to any third-party service.
- **FR-019**: Each of the nine grid thumbnails MUST be letterboxed into a fixed-size square cell, maintaining the mosaic's true W:H aspect ratio. Because mosaic height (H) is fixed and width (W) is derived from the crop, thumbnails will typically be portrait-oriented; letterboxing fills any remaining horizontal space with neutral padding.

### Key Entities

- **MosaicCandidate**: A single generated mosaic at a specific brightness and contrast offset. Key attributes: brightness offset (integer, −100 to 100), contrast offset (integer, −100 to 100), mosaic grid data (W×H brick grid where H is the user-selected brick height defaulting to 32, and W is derived from the crop's aspect ratio), generated status (pending/ready/error).
- **CandidateGrid**: The current 3×3 display of nine candidates. Key attributes: center candidate, step size (the ±offset used for the eight surrounding candidates), nine MosaicCandidates.
- **SelectionHistory**: Ordered list of candidates chosen by the user, from the initial default to the most recent. Key attributes: list of MosaicCandidates (with timestamps), revert index (which entry is currently active).
- **CandidateCache**: Pre-computed mosaic results keyed by (brightness, contrast) pair. Enables instant display of any previously generated candidate without re-generation.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The initial nine candidates appear fully rendered and interactive within 3 seconds of the user confirming the crop on a standard desktop connection.
- **SC-002**: Each subsequent iteration (user selects a candidate, new grid generates) completes and is interactive within 3 seconds of the click.
- **SC-003**: Reverting to any previously chosen candidate displays the cached mosaic in under 100 milliseconds — imperceptible to the user.
- **SC-004**: The blue visual connection between the center grid cell, the most-recent history entry, and the Confirm Mosaic button is identifiable by 4 out of 5 new users without instruction.
- **SC-005**: Users can reach their preferred candidate (judged visually satisfying) in 5 or fewer grid selections in at least 80% of sessions, as measured in user observation sessions.
- **SC-006**: The feature works correctly in the two most recent versions of Chrome, Firefox, and Safari on desktop.

---

## Assumptions

- Candidate generation uses the same deterministic CIEDE2000 mosaic pipeline established in Phase 1A; the only variables per candidate are the brightness and contrast offsets applied before the mosaic algorithm runs.
- The initial brightness×contrast search space spans [−100, 100] × [−100, 100]. The initial step is 100 × 2/3 ≈ 67, placing the eight surrounding candidates at ±67 in each axis from the center (0, 0).
- Step halving is applied to the step size (not the full range): if step = 67, next step = 33; if step = 33, next step = 16; if step = 16, next step = 8, and so on (Math.floor(step / 2)), floored to a minimum of 1. Note: because the 3×3 grid divides each axis into thirds, the clicked candidate falls in one of three thirds of the prior range — not one of two halves. Step halving therefore produces a new grid that slightly overlaps adjacent thirds rather than exactly tiling the chosen third. A pure ternary approach (step/3) or overlap/randomness injection may converge faster; this is flagged for evaluation in the planning phase and potential revision after user testing.
- The nine candidates (3×3 grid) include the center plus all eight combinations of (center_B ± step, center_C ± step) — i.e., all pairs where each axis is independently offset.
- All nine candidates in a grid use the same step size for both brightness and contrast axes.
- The history strip displays the sequence of user-chosen center candidates (not all nine generated candidates). Only the candidates the user explicitly chose (by clicking) appear in history, plus the initial default.
- Mosaic dimensions: the HEIGHT (H) in brick rows is the user-selected brick count (default 32; options 26–36); the WIDTH (W) in brick columns is derived from the crop's aspect ratio and is not a fixed value. All nine candidates in a session share the same W×H dimensions.
- The performance requirement (SC-001, SC-002: ≤3 seconds) may require server-side generation for some or all candidates; the architecture decision (client-side vs. API) is deferred to the planning phase.
- The candidate selection UI appears on the same page below the crop section, not on a separate page.
- If the client-side generation path is used, all image data stays within the browser session. If an API path is chosen for performance, the cropped image may be transmitted to a first-party server for ephemeral mosaic generation; the server MUST NOT persist or log any image data, and no image data may be sent to third-party services.

---

## Clarifications

### Session 2026-05-31

- Q: If an API is chosen for performance, is it acceptable to send the cropped image to a first-party server? → A: Yes. Sending to a first-party server is acceptable provided the image is processed ephemerally and not persisted or forwarded to any third party. Added FR-018 and updated privacy assumption.
- Q: While the grid is regenerating, does the history strip remain interactive? → A: Yes — history strip stays interactive during generation; clicking a history entry cancels in-progress generation and immediately shows the cached prior candidate. Updated FR-013.
- Q: How are thumbnails sized in the 3×3 grid — square cells or variable aspect ratio? → A: Letterboxed into fixed square cells, maintaining the mosaic's true W:H aspect ratio (height fixed at selected brick count, width derived from crop). Added FR-019 and corrected mosaic dimension assumption and MosaicCandidate entity.
- Q: When step size reaches minimum (1) and all candidates are identical, how should the UI respond? → A: Replace the instructional text above the grid with a non-blocking "Maximum refinement reached" notice; all 9 cells remain visible, Confirm is available. Updated edge case. Also noted that step halving produces slight third/half mismatch vs. pure ternary search; flagged for planning evaluation and post-launch revision based on user convergence data. Updated step-halving assumption.
