# Feature Specification: Phase 1A — Core LEGO Mosaic Generator

**Feature Branch**: `001-lego-mosaic-core`

**Created**: 2026-05-30

**Status**: Complete

**Input**: User description: "Phase 1A of faceplate.me website: a user uploads one face image, manually crops it square, adjusts brightness/contrast, generates one 32x32 LEGO-style mosaic using default deterministic settings, and views the resulting mosaic, color matrix, and parts list."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Upload and Crop a Face Image (Priority: P1)

A user visits the site, selects a photo from their device, and uses an in-browser crop tool to define a square region around the face. The cropped image is confirmed before proceeding.

**Why this priority**: All downstream steps depend on obtaining a valid square face image. Without this, nothing else can run.

**Independent Test**: A tester can upload any image, drag crop handles to select a square region, confirm the selection, and verify the cropped square preview is displayed — delivering a usable input image.

**Acceptance Scenarios**:

1. **Given** a user has a JPEG or PNG photo on their device, **When** they click "Upload Image" and select the file, **Then** the image is displayed in the crop interface at a comfortable viewing size.
2. **Given** the image is displayed, **When** the user drags the crop handles to define a square region and confirms, **Then** a square-cropped preview is shown and the system retains the cropped image for the next step.
3. **Given** the user uploads a file that is not a valid image (e.g., a PDF or text file), **When** they attempt to confirm the upload, **Then** a clear error message is displayed and no crop interface is shown.

---

### User Story 2 — Adjust Brightness and Contrast (Priority: P2)

After cropping, the user can move brightness and contrast sliders to tune the image before generating the mosaic. Changes are reflected in a live preview.

**Why this priority**: Brightness and contrast tuning is the primary quality lever for mosaic output, directly affecting how recognizable the face is in the final result. It is independent of mosaic generation and can be tested alone.

**Independent Test**: A tester can upload and crop an image, then move both sliders and verify that the image preview updates to reflect the adjusted values, without proceeding to mosaic generation.

**Acceptance Scenarios**:

1. **Given** a cropped image is ready, **When** the user adjusts the brightness slider across its range, **Then** the preview image visibly lightens or darkens in real time.
2. **Given** a cropped image is ready, **When** the user adjusts the contrast slider across its range, **Then** the preview image visibly increases or decreases contrast in real time.
3. **Given** default slider positions (no adjustment), **When** the user views the preview, **Then** the image appears identical to the cropped original.

---

### User Story 3 — Generate LEGO Mosaic (Priority: P3)

The user clicks a "Generate" button and the system produces a single 32×32 LEGO-style mosaic using fixed, deterministic algorithm settings. The result is always the same for the same input.

**Why this priority**: This is the core algorithmic output of the feature. It depends on the cropped, adjusted image from Stories 1 and 2.

**Independent Test**: A tester can supply a fixed cropped image at default brightness/contrast, click Generate, and verify that the mosaic produced is a 32×32 grid of colored LEGO-palette squares, and that running Generate again with the same input yields an identical result.

**Acceptance Scenarios**:

1. **Given** a cropped and adjusted image is ready, **When** the user clicks "Generate Mosaic", **Then** the Generate button becomes disabled, a visible progress indicator and status message ("Generating mosaic…") appear, and the system produces a 32×32 pixel-art mosaic within a few seconds.
2. **Given** the same image and settings, **When** the user generates the mosaic multiple times, **Then** the output is identical each time (deterministic).
3. **Given** the mosaic is generated, **When** the user views the result, **Then** the progress indicator disappears, the Generate button re-enables, and the mosaic is displayed at a legible size alongside the original cropped input.

---

### User Story 4 — View Color Matrix and Parts List (Priority: P4)

After generation, the user can view the color matrix (a labeled grid showing which LEGO color code occupies each of the 32×32 cells) and a parts list (a summary of how many of each color are needed).

**Why this priority**: These outputs are what make the mosaic actionable for building — the user needs both the assembly map and the shopping list. They depend on the generated mosaic from Story 3.

**Independent Test**: A tester can trigger mosaic generation and verify that a 32×32 color matrix with color identifiers is shown, and that a separate aggregated parts count list is also displayed, with counts that sum to exactly 1,024.

**Acceptance Scenarios**:

1. **Given** a mosaic has been generated, **When** the user views the color matrix, **Then** a 32×32 grid is displayed where each cell shows a color identifier corresponding to the LEGO color used in that position.
2. **Given** a mosaic has been generated, **When** the user views the parts list, **Then** a list is shown with each unique LEGO color name/ID and the count of tiles needed, totaling exactly 1,024 pieces.
3. **Given** a very uniform image (e.g., solid white), **When** the mosaic is generated, **Then** the parts list contains only one color entry with a count of 1,024.

---

### Edge Cases

- What happens when the uploaded image itself is smaller than 100×100 pixels? The system should display a warning that the image is too small to produce a useful crop and prevent proceeding.
- What happens when the user's crop selection is smaller than 100×100 pixels? The system displays a warning and disables the Generate button until a valid crop is selected.
- What happens when the user uploads a very large image (e.g., 20 MB)? The system should accept it or show a clear file size limit error.
- What happens if the user crops a region so small it is essentially empty or extremely low-resolution? The system should warn that the crop selection is too small to produce a useful mosaic.
- What happens when brightness and contrast sliders are at their extremes simultaneously (e.g., max brightness + max contrast)? The mosaic generation should still complete without error.
- What if the user navigates back to re-crop after already generating a mosaic? The mosaic and parts list should be cleared and the user must re-generate.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow users to upload a single image file in JPEG or PNG format from their local device.
- **FR-002**: The system MUST present an interactive square crop tool after image upload, allowing the user to select any square sub-region of the uploaded image. The minimum valid crop size is 100×100 pixels; if the selection is smaller, the system MUST display a warning and prevent the user from proceeding to Generate.
- **FR-003**: The system MUST display a live preview of the cropped image after the user confirms the crop selection.
- **FR-004**: The system MUST provide a brightness slider with a range of −128 to +128 and a contrast slider with a range of −128 to +128, each defaulting to 0.
- **FR-005**: The system MUST update the image preview in real time as the user adjusts brightness or contrast sliders.
- **FR-006**: The system MUST generate a single 32×32 LEGO-palette mosaic from the cropped, adjusted image using fixed, default algorithm settings (interpolation method: average pooling; color distance: CIEDE2000; piece type: 1×1 square plate).
- **FR-007**: Mosaic generation MUST be deterministic: identical inputs always produce identical outputs.
- **FR-008**: The system MUST display the generated mosaic as a visual 32×32 grid using the colors of matched LEGO pieces.
- **FR-009**: The system MUST display a color matrix: a 32×32 grid where each cell shows the identifier of the LEGO color assigned to that position.
- **FR-010**: The system MUST display a parts list: an aggregated count of each distinct LEGO color used, summing to exactly 1,024 pieces.
- **FR-011**: The system MUST display the original cropped face image alongside the generated mosaic for visual comparison.
- **FR-012**: If an uploaded file is not a valid JPEG or PNG image, the system MUST display a clear error message and prevent further processing.
- **FR-013**: The system MUST perform all image processing and mosaic generation entirely within the user's browser. No image data or derived output may be transmitted to any server at any point.
- **FR-014**: While mosaic generation is in progress, the system MUST display a visible progress indicator and a status message, and MUST disable the Generate button to prevent duplicate submissions.
- **FR-015**: The upload step MUST display an inline privacy notice informing the user that their image never leaves their device and all processing occurs in the browser.

### Key Entities

- **Face Image**: The user-supplied photo. Key attributes: file format (JPEG/PNG), pixel dimensions, file size.
- **Cropped Image**: A square sub-region of the Face Image selected by the user. Key attributes: square pixel dimensions, pixel data.
- **Adjusted Image**: The Cropped Image with brightness and contrast applied. Key attributes: brightness offset (−128 to +128), contrast offset (−128 to +128), resulting pixel data.
- **Mosaic**: A 32×32 grid of LEGO color assignments derived from the Adjusted Image. Key attributes: 1,024 color assignments, each referencing a LEGO palette color.
- **LEGO Color**: A specific color available in the LEGO 1×1 square plate palette, sourced from a static data file bundled with the app. Key attributes: color ID, color name, RGB value used for matching.
- **Color Matrix**: A 32×32 structured representation of the Mosaic showing per-cell color identifiers.
- **Parts List**: An aggregated count per LEGO color across all 1,024 cells of the Mosaic.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can upload an image, crop it, adjust brightness/contrast, generate a mosaic, and view the mosaic, color matrix, and parts list — all within a single browser session with no page reloads required.
- **SC-002**: Mosaic generation completes and the result is displayed within 10 seconds of the user clicking "Generate" for a standard face photo.
- **SC-003**: The parts list counts always sum to exactly 1,024, verifiable by inspection.
- **SC-004**: The mosaic result is visually recognizable as a pixelated representation of the uploaded face to at least 3 out of 5 independent observers shown a side-by-side comparison.
- **SC-005**: 90% of first-time users can complete the full upload-to-mosaic flow without needing external help, as measured by task-completion observation.
- **SC-006**: The application works correctly in the two most recent versions of Chrome, Firefox, and Safari without browser-specific workarounds.

---

## Assumptions

- Users are accessing the site via a desktop or laptop browser; mobile layout is a stretch goal, not a requirement for Phase 1A.
- The LEGO color palette used is the set of colors available for LEGO 1×1 square plates (consistent with the lego-art-remix reference implementation).
- Default algorithm settings are: interpolation = average pooling, color distance = CIEDE2000, piece type = 1×1 square plate. These values are fixed for Phase 1A with no user-configurable controls exposed.
- No user account, login, or persistent storage is required; the session is entirely in-browser and stateless from the server's perspective.
- All image processing and mosaic generation runs entirely in the user's browser. No image data, pixel data, or derived output is ever transmitted to a server. This is a firm constraint, not a planning-phase decision.
- The lego-art-remix algorithm will be re-implemented independently, respecting the intellectual property of the original creator, rather than calling an external service.
- The LEGO 1×1 square plate color palette (IDs, names, RGB values) is bundled as a static data file within the app. No external fetch is required at runtime; the palette does not change without a code update.
- File size limit for uploads is assumed to be 10 MB; files exceeding this show a clear error.
- The color matrix display uses short human-readable color identifiers (e.g., LEGO color names or standard color IDs), not RGB hex codes.
- HSV adjustment, alternative interpolation modes, and alternative color distance algorithms are explicitly out of scope for Phase 1A.
- Camera capture, multi-candidate generation, backing plate design, BrickLink integration, Studio export, PDF export, telemetry, projects, and LLM features are all out of scope for Phase 1A.

---

## Clarifications

### Session 2026-05-30

- Q: Should all image processing and mosaic generation run client-side in the browser, or may processing be delegated to a server? → A: Client-side only. No image data is ever sent to a server.
- Q: Where does the LEGO color palette data come from? → A: Static hardcoded file bundled with the app; no external fetch required.
- Q: What does the user see while mosaic generation is running? → A: Visible progress indicator and status message; Generate button disabled until complete.
- Q: Should the app display an explicit privacy notice about image processing? → A: Yes — inline notice near the upload control stating the image never leaves the device.
- Q: What is the minimum valid crop selection size? → A: 100×100 pixels; warn and block Generate if smaller.
