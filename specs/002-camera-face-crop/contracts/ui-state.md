# Contract: Updated UI State Machine

**Module**: `src/lib/app-state.ts` (updated)
**Phase**: 1B/1C-pre

---

## New State Phases

```typescript
// Camera capture
| { phase: 'camera-viewfinder'; session: CameraSession }
| { phase: 'camera-preview'; photo: CapturedPhoto; session: CameraSession }
| { phase: 'camera-error'; error: string }

// Image preparation (EXIF + head detection)
| { phase: 'preparing'; image: FaceImage }

// Seeded manual head crop (replaces Phase 1A 'cropping')
| { phase: 'head-cropping'; image: FaceImage; headBounds: HeadBounds; brickHeight: BrickHeight }
| { phase: 'head-crop-error'; image: FaceImage; headBounds: HeadBounds; error: string }
```

---

## New Transition Functions

```typescript
// Camera flow
function onCameraRequested(state: { phase: 'idle' }): AppState
// → 'camera-viewfinder' (after getUserMedia resolves)

function onCameraSessionReady(
  state: { phase: 'camera-viewfinder' },
  session: CameraSession
): AppState
// → 'camera-viewfinder' with active session

function onPhotoCaptured(
  state: { phase: 'camera-viewfinder'; session: CameraSession },
  photo: CapturedPhoto
): AppState
// → 'camera-preview'

function onPhotoRetaken(
  state: { phase: 'camera-preview'; session: CameraSession }
): AppState
// → 'camera-viewfinder'; no photo submitted

function onPhotoConfirmed(
  state: { phase: 'camera-preview'; photo: CapturedPhoto; session: CameraSession }
): AppState
// → 'preparing'; camera stream stopped

function onCameraError(
  state: AppState,
  error: string
): AppState
// → 'camera-error'; stream stopped if active

// Image preparation
function onImagePrepared(
  state: { phase: 'preparing'; image: FaceImage },
  headBounds: HeadBounds
): AppState
// → 'head-cropping' with default brickHeight: 32

// Head crop flow
function onBrickHeightChanged(
  state: { phase: 'head-cropping'; image: FaceImage; headBounds: HeadBounds; brickHeight: BrickHeight },
  brickHeight: BrickHeight
): AppState
// → same phase, brickHeight updated; handle positions scale accordingly

function onHeadCropConfirmed(
  state: { phase: 'head-cropping' },
  crop: HeadCropSelection
): AppState
// → 'adjusting' with brightness: 0, contrast: 0

function onResetToFullImage(
  state: { phase: 'head-cropping' | 'head-crop-error' }
): AppState
// → 'head-cropping'; handles reset to full image edges; brickHeight preserved
```

---

## Updated Component ↔ State Dependency Matrix

| Component | Visible phases | Renders from |
|---|---|---|
| `<UploadArea>` | `idle`, `upload-error` | Camera option visible when supported |
| `<CameraViewfinder>` | `camera-viewfinder` | `state.session.stream` |
| `<CameraPreview>` | `camera-preview` | `state.photo` |
| `<CameraError>` | `camera-error` | `state.error` |
| `<HeadCropTool>` | `head-cropping`, `head-crop-error` | `state.image`, `state.headBounds`, `state.brickHeight` |
| `<AdjustmentPanel>` | `adjusting`, `generating`, `result` | `state.crop`, sliders |
| `<MosaicDisplay>` | `result` | `state.mosaic` |
| `<ColorMatrix>` | `result` | `state.mosaic` |
| `<PartsList>` | `result` | `state.mosaic` (totalPieces = 32 × height) |

---

## Camera Resource Management

**MUST**: The `CameraSession.stream` MUST be stopped (`stream.getTracks().forEach(t => t.stop())`) when leaving `camera-viewfinder` or `camera-preview` states by any transition. Failing to stop the stream keeps the camera active and the browser camera indicator light on.

This is enforced in `onPhotoConfirmed`, `onPhotoRetaken` (back to viewfinder doesn't stop stream), `onCameraError`, and `onReset`.
