# Feature Specification: Phase 1B/1C-pre — Camera Capture and Seeded Manual Head-Height Crop

**Feature Branch**: `002-camera-face-crop`

**Created**: 2026-05-31

**Status**: Complete

**Input**: User description: "Phase 1B camera capture (camera primary in UI, upload always available as secondary). Phase 1C pre-candidate: detect head bounds (top of skull to bottom of chin), seed a manual crop interface with those handles so the user can adjust, and include a brick height selector (32/30/28/26) that sets the crop aspect ratio."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Capture a Photo with the Device Camera (Priority: P1)

A user visits the site on a device with a camera. The camera capture option is presented prominently at the top of the page. The user taps "Use Camera," grants permission, sees a live viewfinder, takes a photo, and the captured image enters the same downstream processing as an uploaded file. The file upload option remains always accessible below the camera section for users who prefer it.

**Why this priority**: Camera capture is the primary Phase 1B deliverable. Presenting it first eliminates the friction of pre-transferring a photo to a desktop, making the tool accessible in mobile and real-time capture scenarios. File upload remains available but is no longer the lead option on camera-capable devices.

**Independent Test**: A tester on a camera-equipped device can arrive at the page, use only the camera option (never touching file upload), take a photo, confirm it, and arrive at the head-height crop screen — completing the flow end-to-end.

**Acceptance Scenarios**:

1. **Given** a user visits the site on a camera-equipped device, **When** the page loads, **Then** the "Use Camera" section is displayed prominently above the file upload option.
2. **Given** the user selects "Use Camera," **When** camera permission is granted, **Then** a live viewfinder is displayed.
3. **Given** the viewfinder is active, **When** the user clicks the capture button, **Then** a still photo is taken and a preview is shown alongside "Confirm" and "Retake" options.
4. **Given** the user clicks "Confirm," **Then** the captured photo proceeds to the head-height crop step.
5. **Given** the user clicks "Retake," **Then** the viewfinder resumes and no photo is submitted.
6. **Given** the user denies camera permission, **Then** a clear error message is shown with guidance on re-enabling permission, and the file upload option remains available and usable.
7. **Given** the user is on a device or browser that does not support camera capture, **Then** the camera section is hidden entirely and only the file upload option is shown.
8. **Given** a camera-capable device is in use, **When** the user scrolls past the camera section, **Then** the file upload option is fully functional and proceeds through the same downstream flow.

---

### User Story 2 — Seeded Manual Head-Height Crop (Priority: P2)

After an image is obtained (via camera or file upload), the system automatically detects the top of the skull and the bottom of the chin and uses those bounds to pre-position crop handles in a manual crop interface. The user can accept the suggested crop as-is or drag the handles to adjust. The user also selects a target brick height (32, 30, 28, or 26 bricks) which sets the aspect ratio of the crop. This reflects the aesthetic of the Hall of Faces — tight, head-to-chin portraits with a consistent feel — while preserving user control.

**Why this priority**: The head-height crop normalizes the portrait orientation across all generated mosaics and gives users a fast, accurate starting point without fully removing their agency. The brick height selector allows intentional sizing choices for smaller faces within the mosaic grid. This step depends on US1 or the existing file-upload flow.

**Independent Test**: A tester supplies a full-length portrait photo, selects a brick height of 30, and verifies that the crop handles are pre-positioned approximately at the top of the skull and the bottom of the chin. The tester adjusts one handle slightly, confirms the crop, and verifies that the subsequent mosaic generation uses the adjusted crop with 30 bricks of height.

**Acceptance Scenarios**:

1. **Given** an image has been obtained, **When** the head-height crop screen appears, **Then** crop handles are pre-positioned with the top handle near the top of the skull and the bottom handle near the chin/jaw, the left and right edges are automatically set to produce a square crop (1:1) at the default 32-brick height, and a brick height dropdown defaulting to 32 is visible.
2. **Given** the crop screen is shown, **When** the user selects a different brick height (e.g., 28 or 34), **Then** the crop aspect ratio adjusts to 32:H, the left/right edges update automatically so the crop remains centered on the head, and the user can re-adjust the top/bottom handles.
3. **Given** the user accepts the pre-seeded crop and clicks "Confirm Crop," **Then** the cropped image — sized at the 32:H aspect ratio for the selected brick height — proceeds to the brightness/contrast step.
4. **Given** the user adjusts the crop handles before confirming, **Then** the confirmed crop uses the user-adjusted bounds, not the originally detected bounds.
5. **Given** the user clicks "Reset to full image height," **Then** the top and bottom handles move to the full image edges, the left/right edges update automatically to maintain the 32:H aspect ratio centered horizontally, and the brick height selection is preserved.
6. **Given** head detection finds no head in the image, **Then** the crop handles default to the full image edges, a non-blocking notice ("Head not detected — handles set to full image") is shown, and the user proceeds normally.

---

### Edge Cases

- What if the device has both front and back cameras? The front camera is the default; a "Switch Camera" control appears when multiple cameras are available.
- What if camera permission was permanently denied in browser settings? The error message includes browser-specific instructions (e.g., "Tap the lock icon in your browser's address bar to re-enable camera access").
- What if the captured image is very dark? The image is accepted as-is; brightness can be corrected in the existing adjustment step.
- What if the detected head bounds are very narrow (e.g., detection clips to only the nose and eyes)? The system enforces a minimum detected head height of 150 pixels in the original image; if the detection result is smaller, handles default to the full image and the "Head not detected" notice is shown.
- What if the selected brick height changes the aspect ratio? The top/bottom handles reposition vertically to keep the head centered within the new height, and the left/right edges update automatically to maintain the 32:H aspect ratio. The user can fine-tune the top/bottom handles afterward.
- What happens with a group photo where multiple heads are present? The system positions handles around the most prominent head (largest or most centered) and the user can adjust.
- What if the user navigates back to recapture or re-upload after seeing the crop screen? The previous crop and detection result are discarded and detection runs fresh on the new image.
- What if the image has an EXIF orientation tag indicating it is rotated (common with mobile camera captures)? The system corrects the pixel orientation before any display or processing; the crop interface and head detection always receive an upright image.

---

## Requirements *(mandatory)*

### Functional Requirements

**Camera Capture (Phase 1B)**

- **FR-001**: When the user's device and browser support camera capture, the system MUST display the camera option prominently at the top of the image acquisition screen, above the file upload option.
- **FR-002**: The file upload option MUST always be displayed and functional, regardless of whether camera capture is available.
- **FR-003**: The system MUST request camera permission from the device when the user activates the camera option.
- **FR-004**: The system MUST display a live camera viewfinder after camera permission is granted, defaulting to the front-facing camera on devices with multiple cameras.
- **FR-005**: The system MUST provide a "Switch Camera" control when the device has more than one camera.
- **FR-006**: The system MUST allow the user to take a still photo from the viewfinder with a single action.
- **FR-007**: After capture, the system MUST display a photo preview with "Confirm" and "Retake" options before proceeding.
- **FR-008**: The system MUST handle camera permission denial with a clear error message that includes browser-specific guidance for re-enabling camera access.
- **FR-009**: The system MUST hide the camera option entirely on devices or browsers that do not support camera capture, without leaving visible empty space.
- **FR-010**: A confirmed captured photo MUST proceed through the same downstream flow as an uploaded file, beginning with the head-height crop step.

**Seeded Manual Head-Height Crop (Phase 1C pre-candidate)**

- **FR-011**: After an image is obtained by any means, the system MUST automatically detect the vertical bounds of the head — defined as the top of the skull and the bottom of the chin/jaw — and use those coordinates to pre-position the top and bottom crop handles.
- **FR-012**: The system MUST display a manual crop interface with top and bottom drag handles pre-seeded from head detection. The left and right crop edges MUST be computed automatically to enforce the 32:H aspect ratio (where H is the selected brick height), centered horizontally on the detected head. The user adjusts only the top and bottom handles; the left/right edges update in real time to maintain the aspect ratio and horizontal centering.
- **FR-013**: The system MUST display a brick height selector with options 26, 28, 30, 32, 34, and 36, defaulting to 32. The selected value sets the mosaic output height in bricks and determines the crop aspect ratio (32 wide × H high in bricks). At the default value of 32, the crop is square (1:1).
- **FR-014**: When the user changes the brick height selection, the system MUST reposition the top and bottom handles to keep the head region centered within the new height ratio and recompute the left/right edges accordingly, preserving as much of the previously adjusted vertical region as possible.
- **FR-015**: The system MUST provide a "Reset to full image height" action that repositions the top and bottom handles to the full image edges and recomputes the left/right edges to maintain the 32:H aspect ratio, while preserving the current brick height selection.
- **FR-016**: When the user confirms the crop, the system MUST apply the crop at the user-adjusted (or accepted) handle positions and proceed to the brightness/contrast adjustment step using that cropped image.
- **FR-017**: If head detection finds no head, or the detected head height is less than 150 pixels in the original image, the system MUST default the handles to the full image edges, display a non-blocking notice, and allow the user to proceed without any error blocking them.
- **FR-018**: All image processing and head detection MUST run entirely within the user's browser. No image data or derived output may be transmitted to any server at any point.
- **FR-020**: Head detection MUST be deterministic: the same input image MUST produce the same detected head bounds on every run, every device, and every supported browser. This ensures the pre-seeded crop handle positions are regression-testable.
- **FR-021**: Before displaying the crop interface, the system MUST read the EXIF orientation tag from the image (if present) and rotate the pixel data to the correct upright orientation. The corrected image is what is shown in the crop interface and passed to all downstream steps.
- **FR-019**: The image acquisition screen MUST continue to display the privacy notice from Phase 1A.

### Key Entities

- **Camera Session**: An active device camera feed initiated by the user. Key attributes: active/inactive status, selected camera (front/back), permission state.
- **Captured Photo**: A still image taken from the camera feed. Key attributes: pixel data, dimensions.
- **Head Bounds**: The detected vertical coordinates of the head region within an image. Key attributes: top-Y offset (top of skull), bottom-Y offset (bottom of chin/jaw), detection status (found/not-found).
- **Head-Height Crop**: The region of the image defined by the user-adjusted crop handles and the auto-computed left/right edges. Key attributes: top-Y, bottom-Y, left-X, right-X (auto-computed), resulting pixel dimensions at the 32:H aspect ratio.
- **Brick Height Selection**: The user's chosen mosaic output height in bricks. Allowed values: 26, 28, 30, 32, 34, 36. Determines both the mosaic row count and the crop aspect ratio (32 wide × H high). At 32 (default), the crop is square. Total mosaic cells = 32 × H.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user on a camera-equipped device can capture a photo and reach the head-height crop screen without using file upload, completing the camera capture flow in 5 steps or fewer.
- **SC-002**: The automatic head-bound detection correctly positions the pre-seeded crop handles within 10% of the skull top and chin bottom in at least 80% of standard single-face portrait photos, as verified by an independent reviewer.
- **SC-003**: When head detection produces no result, the user is notified and can still complete the full mosaic generation flow without encountering any error state.
- **SC-004**: The camera capture and head-height crop flow works correctly in the two most recent versions of Chrome, Firefox, and Safari on devices with cameras.
- **SC-005**: On devices without a camera, the upload interface appears unchanged — the camera section is absent and no empty space is visible.
- **SC-006**: Selecting any of the six brick heights (26, 28, 30, 32, 34, 36) produces a correctly proportioned mosaic output with the selected number of brick rows and a total cell count of exactly 32 × H (ranging from 832 to 1,152 before any post-candidate masking).

---

## Assumptions

- The camera option is presented first/prominently to signal that mobile capture is the intended primary experience; file upload is always available below it for users who prefer that path or are on desktop.
- Front camera is the default on multi-camera devices because this feature targets self-portrait capture for the Hall of Faces.
- "Head bounds" are defined as: top = the highest point of the skull (not the topmost hair strand), bottom = the lowest point of the chin/jaw. This matches the aesthetic of the Hall of Faces in which the entire head silhouette is included but the neck and clothing are excluded.
- The detection algorithm is not required to handle occluded or heavily tilted heads accurately; the manual handles give the user full override capability.
- The mosaic width is always 32 bricks. The brick height selector controls the height and the crop aspect ratio, producing mosaic dimensions of 32×26, 32×28, 32×30, 32×32, 32×34, or 32×36 depending on selection. At the default of 32, the mosaic and crop are square (1:1).
- The crop step replaces and supersedes the fixed-square crop from Phase 1A. The Phase 1A manual crop is no longer a separate step; this seeded manual crop step serves that purpose with the added auto-seed, aspect-ratio enforcement, and brick height controls.
- Empirically, manually cropped Hall of Faces portraits at full image width have an approximately 8:5 aspect ratio (640 total bricks, ~600 after top/bottom cell masking). The square 1:1 crop at 32 bricks produces 1,024 total bricks; the largest option (32×36) produces 1,152 bricks before post-candidate masking.
- A "small margin" outside the detected head bounds means approximately 5–10% of the detected head height added as padding on the top and bottom edges, to avoid clipping the skull crown or chin.
- The 150-pixel minimum (FR-017) is measured in the original image's pixel space before any display scaling.
- The crop in this step enforces both the vertical and horizontal extent via the 32:H aspect ratio lock. The mosaic generator receives a pre-cropped image at the 32:H pixel ratio; the full original image width is not used. Post-candidate horizontal processing (Phase 1C) operates at the brick level on the generated mosaic, masking individual cells that fall outside the face rather than re-cropping the pixel source.
- Phase 1C post-candidate (horizontal hard-wall crop + per-cell masking) is explicitly out of scope for this spec.

---

## Clarifications

### Session 2026-05-31

- Q: Does the crop tool constrain both axes (32:H aspect ratio) or only vertical (full image width retained)? → A: Both axes. The crop enforces a 32:H aspect ratio — top/bottom handles are user-adjustable (seeded by detection), left/right edges are auto-computed and centered on the head. At the default 32-brick height the crop is square (1:1). Full image width is not retained. Post-candidate horizontal processing operates at the brick level on the generated mosaic, not on the source pixels.
- Q: Should the parts list total pieces be fixed at 1,024 or vary by brick height? → A: Variable. Total = 32 × selected brick height (832 for 26, up to 1,152 for 36) before post-candidate masking. Empirically, Hall of Faces portraits at 32×32 yield approximately 600 active bricks after masking. Brick height selector expanded to 26, 28, 30, 32 (default), 34, 36.
- Q: Must head detection be deterministic (same image → same bounds every run/device/browser)? → A: Yes. Deterministic required. Enables automated regression testing of the seeded crop handles. Added as FR-020.
- Q: Should the system auto-correct EXIF orientation before the crop interface is shown? → A: Yes. EXIF orientation data must be read and pixel data rotated to upright before crop display and head detection. Added as FR-021 and edge case.
