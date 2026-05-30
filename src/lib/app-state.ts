import type { AppState, FaceImage, CropSelection, AdjustedImage, Mosaic } from '../types/index.js'

export type { AppState }

export function onFileSelected(_state: { phase: 'idle' }): AppState {
  return { phase: 'uploading' }
}

export function onFileValidated(
  _state: { phase: 'uploading' },
  image: FaceImage,
): AppState {
  return { phase: 'cropping', image }
}

export function onFileValidationError(
  _state: { phase: 'uploading' },
  error: string,
): AppState {
  return { phase: 'upload-error', error }
}

export function onCropConfirmed(
  state: { phase: 'cropping'; image: FaceImage },
  crop: CropSelection,
): AppState {
  if (crop.widthPx < 100 || crop.heightPx < 100) {
    return { phase: 'crop-error', image: state.image, error: 'Crop selection is too small. Please select a region of at least 100×100 pixels.' }
  }
  return { phase: 'adjusting', crop, brightness: 0, contrast: 0 }
}

export function onAdjustmentChanged(
  state: { phase: 'adjusting'; crop: CropSelection; brightness: number; contrast: number },
  field: 'brightness' | 'contrast',
  value: number,
): AppState {
  const clamped = Math.max(-128, Math.min(128, value))
  return {
    phase: 'adjusting',
    crop: state.crop,
    brightness: field === 'brightness' ? clamped : state.brightness,
    contrast: field === 'contrast' ? clamped : state.contrast,
  }
}

export function onGenerateClicked(
  state: { phase: 'adjusting'; crop: CropSelection; brightness: number; contrast: number },
  adjusted: AdjustedImage,
): AppState {
  return { phase: 'generating', adjusted }
}

export function onGenerateSuccess(
  state: { phase: 'generating'; adjusted: AdjustedImage },
  mosaic: Mosaic,
): AppState {
  return {
    phase: 'result',
    mosaic,
    adjusted: state.adjusted,
    crop: state.adjusted.source,
  }
}

export function onResetToCrop(_state: AppState, image: FaceImage): AppState {
  return { phase: 'cropping', image }
}

export function onReset(_state: AppState): AppState {
  return { phase: 'idle' }
}
