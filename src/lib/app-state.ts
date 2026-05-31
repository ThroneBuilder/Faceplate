import type {
  AppState,
  FaceImage,
  HeadBounds,
  HeadCropSelection,
  AdjustedImage,
  Mosaic,
  BrickHeight,
  CameraSession,
  CapturedPhoto,
} from '../types/index.js'

export type { AppState }

// ─── Upload flow ──────────────────────────────────────────────────────────────

export function onFileSelected(_state: { phase: 'idle' }): AppState {
  return { phase: 'uploading' }
}

export function onFileValidated(
  _state: { phase: 'uploading' },
  image: FaceImage,
): AppState {
  return { phase: 'preparing', image }
}

export function onFileValidationError(
  _state: { phase: 'uploading' },
  error: string,
): AppState {
  return { phase: 'upload-error', error }
}

// ─── Camera flow (Phase 1B) ───────────────────────────────────────────────────

export function onCameraRequested(_state: { phase: 'idle' }): AppState {
  // Caller initiates getUserMedia; once stream is ready, call onCameraSessionReady
  return { phase: 'uploading' } // temporary while permission is requested
}

export function onCameraSessionReady(
  _state: AppState,
  session: CameraSession,
): AppState {
  return { phase: 'camera-viewfinder', session }
}

export function onPhotoCaptured(
  state: { phase: 'camera-viewfinder'; session: CameraSession },
  photo: CapturedPhoto,
): AppState {
  return { phase: 'camera-preview', photo, session: state.session }
}

export function onPhotoRetaken(
  state: { phase: 'camera-preview'; session: CameraSession },
): AppState {
  return { phase: 'camera-viewfinder', session: state.session }
}

export function onPhotoConfirmed(
  _state: { phase: 'camera-preview'; photo: CapturedPhoto; session: CameraSession },
  image: FaceImage,
): AppState {
  // Camera stream is stopped by the caller before this transition
  return { phase: 'preparing', image }
}

export function onCameraError(_state: AppState, error: string): AppState {
  return { phase: 'camera-error', error }
}

// ─── Preparation (EXIF + head detection) ─────────────────────────────────────

export function onImagePrepared(
  state: { phase: 'preparing'; image: FaceImage },
  headBounds: HeadBounds,
): AppState {
  return {
    phase: 'head-cropping',
    image: state.image,
    headBounds,
    brickHeight: 32,
  }
}

// ─── Head-crop flow (Phase 1C pre-candidate) ─────────────────────────────────

export function onBrickHeightChanged(
  state: { phase: 'head-cropping'; image: FaceImage; headBounds: HeadBounds; brickHeight: BrickHeight },
  brickHeight: BrickHeight,
): AppState {
  return { ...state, brickHeight }
}

export function onHeadCropConfirmed(
  _state: { phase: 'head-cropping' | 'head-crop-error' },
  crop: HeadCropSelection,
): AppState {
  return { phase: 'adjusting', crop, brightness: 0, contrast: 0 }
}

export function onResetToFullImage(
  state: { phase: 'head-cropping'; image: FaceImage; headBounds: HeadBounds; brickHeight: BrickHeight }
    | { phase: 'head-crop-error'; image: FaceImage; headBounds: HeadBounds },
): AppState {
  if (state.phase === 'head-cropping') {
    return {
      phase: 'head-cropping',
      image: state.image,
      headBounds: { ...state.headBounds, topY: 0 },
      brickHeight: state.brickHeight,
    }
  }
  return {
    phase: 'head-cropping',
    image: state.image,
    headBounds: { ...state.headBounds, topY: 0 },
    brickHeight: 32,
  }
}

// ─── Adjustment sliders ───────────────────────────────────────────────────────

export function onAdjustmentChanged(
  state: { phase: 'adjusting'; crop: HeadCropSelection; brightness: number; contrast: number },
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
  _state: { phase: 'adjusting'; crop: HeadCropSelection; brightness: number; contrast: number },
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

// ─── Navigation ───────────────────────────────────────────────────────────────

export function onResetToCrop(_state: AppState, image: FaceImage): AppState {
  return { phase: 'preparing', image }
}

export function onReset(_state: AppState): AppState {
  return { phase: 'idle' }
}
