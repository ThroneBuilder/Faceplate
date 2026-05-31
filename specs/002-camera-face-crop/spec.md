# Feature Specification: Phase 1B/1C-pre — Camera Capture and Automatic Face Height Crop

**Feature Branch**: `002-camera-face-crop`

**Created**: 2026-05-31

**Status**: Draft

**Input**: User description: "Phase 1B camera capture plus Phase 1C pre-candidate face height crop: allow users to capture a photo directly from their device camera as an alternative to file upload, and after obtaining any image automatically crop the top and bottom to align with the detected face height before the manual square crop step."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Capture a Photo with the Device Camera (Priority: P1)

A user visits the site on a device with a camera. Instead of choosing a file, they select "Use Camera," grant camera permission, see a live viewfinder, and take a photo that enters the same processing flow as an uploaded file.

**Why this priority**: Camera capture is the primary deliverable for Phase 1B. It eliminates the need to pre-transfer a photo to a desktop, making the tool usable on mobile and in-person capture scenarios. It is independent of the face-height crop feature.

**Independent Test**: A tester on a device with a camera can select "Use Camera," allow camera access, see a live preview, take a photo, confirm it, and arrive at the existing crop interface — without using file upload at any point.

**Acceptance Scenarios**:

1. **Given** a user is on the site on a camera-equipped device, **When** they select "Use Camera," **Then** the browser requests camera permission and a live viewfinder is displayed.
2. **Given** the viewfinder is active, **When** the user clicks the capture button, **Then** a still photo is taken and a preview is shown alongside a "Confirm" and "Retake" option.
3. **Given** the user clicks "Confirm," **Then** the captured photo enters the same processing flow as an uploaded file, and the face-height crop step begins.
4. **Given** the user clicks "Retake," **Then** the viewfinder resumes and no photo is submitted.
5. **Given** the user denies camera permission, **Then** a clear error message is shown with guidance on re-enabling permission, and the file upload option remains available.
6. **Given** the user is on a device or browser that does not support camera capture, **Then** the "Use Camera" option is hidden and only file upload is shown.

---

### User Story 2 — Automatic Face Height Crop (Priority: P2)

After obtaining an image (via upload or camera), the system automatically detects the vertical bounds of the face and crops the top and bottom to the face height, presenting a normalized portrait crop before the user's manual square crop step.

**Why this priority**: The pre-candidate face-height crop removes extraneous sky, clothing, and background from the top and bottom of the image, tightening the face region so the 32×32 mosaic cells are used efficiently. It depends on an image being available (US1 or the existing file-upload flow).

**Independent Test**: A tester can supply a full-length portrait photo (with head and body), and after the image is obtained the system automatically crops the top and bottom to a band aligned with the face height. The tester can verify the crop is tighter than the original and approximately aligns with the face bounds, then proceed to the manual square crop as in Phase 1A.

**Acceptance Scenarios**:

1. **Given** an image has been obtained (uploaded or captured), **When** the face-height crop runs, **Then** the displayed image is cropped so that the top edge is near the top of the head and the bottom edge is near the chin, with a small margin.
2. **Given** the auto-crop result is shown, **When** the user clicks "Looks good," **Then** they proceed to the manual square crop step using the face-height-cropped image.
3. **Given** the auto-crop result is shown, **When** the user clicks "Use full image instead," **Then** the face-height crop is discarded and the user proceeds to the manual square crop with the original uncropped image.
4. **Given** face detection finds no face in the image, **Then** the system skips the auto-crop, displays a notice ("No face detected — using the full image"), and the user proceeds to the manual square crop with the original image without any error blocking them.

---

### Edge Cases

- What happens if the device has both a front and back camera? The front (selfie) camera is used by default; a "Switch Camera" control allows the user to toggle between available cameras.
- What happens if camera permission was permanently denied in browser settings? The error message includes browser-specific instructions for re-enabling it (e.g., "Click the camera icon in your browser's address bar").
- What happens if the captured image is very dark? The image is accepted as-is; the user can correct brightness using the existing brightness/contrast sliders in the next step.
- What happens if the auto-crop result is extremely narrow (e.g., only the eyes were detected, yielding a very short crop)? The system enforces a minimum face-height crop of 150 pixels; if the detection result is smaller, it falls back to the full image and shows the "No face detected" notice.
- What happens if the user re-uploads or recaptures after already seeing the auto-crop? The previous auto-crop result is discarded and the auto-crop runs fresh on the new image.
- What happens with a group photo where multiple faces are present? The system detects the most prominent face (typically the largest or most centered) and uses its bounds for the crop.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display a "Use Camera" option on the upload screen alongside the existing file upload option, visible only when the user's device and browser support camera capture.
- **FR-002**: The system MUST request camera permission from the device when the user selects "Use Camera."
- **FR-003**: The system MUST display a live camera viewfinder after camera permission is granted, defaulting to the front-facing camera on devices with multiple cameras.
- **FR-004**: The system MUST provide a "Switch Camera" control when the device has more than one camera, allowing the user to toggle between them.
- **FR-005**: The system MUST allow the user to take a still photo from the viewfinder with a single action.
- **FR-006**: After capture, the system MUST display a photo preview with "Confirm" and "Retake" options before proceeding.
- **FR-007**: The system MUST handle camera permission denial with a clear error message that includes browser-specific guidance for re-enabling camera access.
- **FR-008**: The system MUST handle devices and browsers where camera capture is unavailable by hiding the "Use Camera" option entirely.
- **FR-009**: The system MUST process a confirmed captured photo through the same downstream flow as an uploaded file, including the face-height crop step.
- **FR-010**: After an image is obtained by any means, the system MUST automatically detect the vertical bounds of the face and crop the image so the top edge aligns with the top of the head and the bottom edge aligns with the chin, with a small margin.
- **FR-011**: The system MUST display the auto-cropped image to the user with "Looks good" and "Use full image instead" actions.
- **FR-012**: The system MUST proceed to the manual square crop step (Phase 1A) when the user confirms the auto-crop, using the face-height-cropped image as the input.
- **FR-013**: The system MUST proceed to the manual square crop step using the original uncropped image when the user chooses "Use full image instead."
- **FR-014**: If face detection finds no face, the system MUST skip the auto-crop, display a non-blocking notice, and proceed automatically to the manual square crop with the full original image.
- **FR-015**: If the detected face-height crop would produce an image shorter than 150 pixels, the system MUST treat the result as a failed detection and apply FR-014 behavior.
- **FR-016**: All image processing and face detection MUST run entirely within the user's browser. No image data or derived output may be transmitted to any server at any point.
- **FR-017**: The upload screen MUST continue to display the privacy notice from Phase 1A when the camera option is visible.

### Key Entities

- **Camera Session**: An active device camera feed initiated by the user. Key attributes: active/inactive status, selected camera (front/back), permission state.
- **Captured Photo**: A still image taken from the camera feed. Key attributes: pixel data, dimensions, capture timestamp.
- **Face Bounds**: The detected vertical coordinates (top Y and bottom Y) of the face region within an image. Key attributes: top-Y offset, bottom-Y offset, confidence level, detection status (found/not-found).
- **Face-Height Crop**: The image after automatic top/bottom cropping to the face bounds. Key attributes: resulting pixel dimensions, source image reference, face-bounds used.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user on a camera-equipped device can capture a photo and reach the manual square crop step without any file upload, completing the capture flow in 5 steps or fewer.
- **SC-002**: The automatic face-height crop correctly identifies and frames the face (top of head to chin, ±20% margin) in at least 80% of standard single-face portrait photos when tested by an independent reviewer.
- **SC-003**: When face detection produces no result, the user receives a clear notice and can still complete the full mosaic generation flow without encountering any error state.
- **SC-004**: The camera capture and auto-crop flow works correctly in the two most recent versions of Chrome, Firefox, and Safari on devices with cameras.
- **SC-005**: On devices without a camera, the upload interface is visually unchanged from Phase 1A — the camera option does not appear or leave empty space.

---

## Assumptions

- The "Use Camera" option is presented as a peer option to file upload, not a replacement — both are always available where supported.
- Front camera is the default on devices with multiple cameras because this feature targets selfie-style face captures.
- The face detection algorithm handles single-face and multi-face images (using the most prominent face) but is not required to handle occluded, tilted, or partial faces accurately; failed detections fall back gracefully (FR-014).
- The auto-crop step applies only to the vertical axis (top and bottom); horizontal bounds are left to the user's manual square crop for Phase 1B/1C-pre. Horizontal auto-crop and per-cell masking are deferred to the Phase 1C post-candidate spec.
- The face-height crop step inserts between image acquisition (upload or camera) and the manual square crop step from Phase 1A. The manual square crop step is unchanged.
- A "small margin" above the head and below the chin means approximately 10–15% of the detected face height added as padding on each side, to avoid clipping hair or chin.
- Camera capture on desktop browsers uses the device's default webcam; no special hardware beyond a standard camera is required.
- The 150-pixel minimum for a valid face-height crop (FR-015) is measured in the original image's pixel space, not the display size.
- Phase 1C post-candidate (side hard-wall crop + per-cell masking) is explicitly out of scope for this spec.
