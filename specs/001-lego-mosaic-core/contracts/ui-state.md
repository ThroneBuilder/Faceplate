# Contract: UI State Machine

**Module**: `src/lib/app-state.ts`
**Phase**: 1A

Defines the discriminated-union state type and transition functions that drive the single-page application. This contract ensures UI components depend on state, not each other.

---

## State Type

```ts
export type AppState =
  | { phase: 'idle' }
  | { phase: 'uploading' }
  | { phase: 'upload-error'; error: string }
  | { phase: 'cropping'; image: FaceImage }
  | { phase: 'crop-error'; image: FaceImage; error: string }
  | { phase: 'adjusting'; crop: CropSelection; brightness: number; contrast: number }
  | { phase: 'generating'; adjusted: AdjustedImage }
  | { phase: 'result'; mosaic: Mosaic; adjusted: AdjustedImage; crop: CropSelection }
```

---

## Transition Functions

Each transition is a pure function — it takes the current state and returns a new state.

```ts
// File selected from input
function onFileSelected(state: { phase: 'idle' }, file: File): AppState

// File validated successfully → enter crop view
function onFileValidated(state: { phase: 'uploading' }, image: FaceImage): AppState

// File validation failed → error state
function onFileValidationError(state: { phase: 'uploading' }, error: string): AppState

// User confirmed crop selection
function onCropConfirmed(
  state: { phase: 'cropping'; image: FaceImage },
  crop: CropSelection
): AppState  // → 'adjusting' if crop valid, → 'crop-error' if crop < 100×100

// Slider changed
function onAdjustmentChanged(
  state: { phase: 'adjusting'; crop: CropSelection; brightness: number; contrast: number },
  field: 'brightness' | 'contrast',
  value: number
): AppState  // → same phase with updated value

// Generate button clicked
function onGenerateClicked(
  state: { phase: 'adjusting'; crop: CropSelection; brightness: number; contrast: number }
): AppState  // → 'generating'

// Generation completed
function onGenerateSuccess(
  state: { phase: 'generating'; adjusted: AdjustedImage },
  mosaic: Mosaic
): AppState  // → 'result'

// User requests re-crop (from any post-crop state)
function onResetToCrop(state: AppState, image: FaceImage): AppState  // → 'cropping'; clears mosaic

// User uploads new image (from any state)
function onReset(state: AppState): AppState  // → 'idle'; clears everything
```

---

## Transition Guards

| Transition | Guard |
|---|---|
| `onCropConfirmed` | `crop.widthPx >= 100 && crop.heightPx >= 100` → proceed; else → crop-error |
| `onFileValidated` | Called only after MIME type and file size checks pass |
| `onGenerateClicked` | Generate button is disabled while in `'generating'` phase (FR-014) |
| `onAdjustmentChanged` | Value clamped to [−128, 128] before transition |

---

## UI Component ↔ State Dependency Matrix

| Component | Visible phases | Renders from |
|---|---|---|
| `<UploadArea>` | `idle`, `upload-error` | — |
| `<CropTool>` | `cropping`, `crop-error` | `state.image` |
| `<AdjustmentPanel>` | `adjusting`, `generating`, `result` | `state.crop`, `state.brightness`, `state.contrast` |
| `<GenerateButton>` | `adjusting`, `generating`, `result` | Disabled when `phase === 'generating'` |
| `<ProgressIndicator>` | `generating` | Status message |
| `<MosaicDisplay>` | `result` | `state.mosaic` |
| `<ColorMatrix>` | `result` | `state.mosaic` |
| `<PartsList>` | `result` | `state.mosaic` |
| `<PrivacyNotice>` | `idle`, `upload-error` | Static copy (FR-015) |
