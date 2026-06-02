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
  CandidateGrid,
  SelectionHistory,
  CandidateCache,
  FaceMask,
} from '../types/index.js'
import { DEFAULT_DISTANCE, buildInitialGrid as _buildInitialGrid, buildNextGrid as _buildNextGrid } from './candidates/grid.js'
import { buildInitialMask, toggleMaskCell } from './face-shaping/mask.js'

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

// ─── Candidate grid (Phase 2A/2B) ────────────────────────────────────────────

export function onCropConfirmed(
  _state: AppState,
  crop: HeadCropSelection,
  distance = DEFAULT_DISTANCE,
): Extract<AppState, { phase: 'candidate-grid' }> {
  const grid = _buildInitialGrid(distance)
  const history: SelectionHistory = {
    entries: [{ key: grid.center, stepSize: distance, chosenAt: Date.now() }],
    activeIndex: 0,
  }
  const cache: CandidateCache = new Map()
  return { phase: 'candidate-grid', crop, grid, history, cache }
}

export function onWorkerCellReady(
  state: Extract<AppState, { phase: 'candidate-grid' }>,
  cellIndex: number,
  mosaic: Mosaic,
  durationMs?: number,
): Extract<AppState, { phase: 'candidate-grid' }> {
  const cells = state.grid.cells.slice() as CandidateGrid['cells']
  cells[cellIndex] = { ...cells[cellIndex], status: 'ready', mosaic, durationMs }
  return { ...state, grid: { ...state.grid, cells } }
}

export function onWorkerCellError(
  state: Extract<AppState, { phase: 'candidate-grid' }>,
  cellIndex: number,
  errorMessage: string,
): Extract<AppState, { phase: 'candidate-grid' }> {
  const cells = state.grid.cells.slice() as CandidateGrid['cells']
  cells[cellIndex] = { ...cells[cellIndex], status: 'error', errorMessage }
  return { ...state, grid: { ...state.grid, cells } }
}

export function onCandidateCellSelected(
  state: Extract<AppState, { phase: 'candidate-grid' }>,
  cellIndex: number,
  distance: number,
): Extract<AppState, { phase: 'candidate-grid' }> {
  if (cellIndex === 4) return state
  const cell = state.grid.cells[cellIndex]
  if (cell.status !== 'ready') return state

  const selectedKey = cell.key
  const newGrid = _buildNextGrid(selectedKey, distance)

  for (let i = 0; i < 9; i++) {
    const cacheKey = `${newGrid.cells[i].key.brightnessOffset}:${newGrid.cells[i].key.contrastOffset}`
    const cached = state.cache.get(cacheKey)
    if (cached) newGrid.cells[i] = { ...newGrid.cells[i], status: 'ready', mosaic: cached }
  }

  const prevEntries = state.history.entries.slice(0, state.history.activeIndex + 1)
  const newHistory: SelectionHistory = {
    entries: [...prevEntries, { key: selectedKey, stepSize: distance, chosenAt: Date.now() }],
    activeIndex: prevEntries.length,
  }

  return { ...state, grid: newGrid, history: newHistory }
}

export function onHistoryEntryClicked(
  state: Extract<AppState, { phase: 'candidate-grid' }>,
  historyIndex: number,
): Extract<AppState, { phase: 'candidate-grid' }> {
  if (historyIndex === state.history.activeIndex) return state
  const entry = state.history.entries[historyIndex]
  const newHistory: SelectionHistory = { ...state.history, activeIndex: historyIndex }

  const newGrid = _buildNextGrid(entry.key, entry.stepSize)
  for (let i = 0; i < 9; i++) {
    const cacheKey = `${newGrid.cells[i].key.brightnessOffset}:${newGrid.cells[i].key.contrastOffset}`
    const cached = state.cache.get(cacheKey)
    if (cached) newGrid.cells[i] = { ...newGrid.cells[i], status: 'ready', mosaic: cached }
  }

  return { ...state, grid: newGrid, history: newHistory }
}

export function onConfirmMosaic(
  state: Extract<AppState, { phase: 'candidate-grid' }>,
): Extract<AppState, { phase: 'mosaic-confirmed' }> {
  const centerCell = state.grid.cells[4]
  const mosaic = centerCell.mosaic!
  return { phase: 'mosaic-confirmed', crop: state.crop, mosaic, key: state.grid.center }
}

// ─── Face shaping (Phase 004) ─────────────────────────────────────────────────

export function onFaceShapingStart(
  state: Extract<AppState, { phase: 'mosaic-confirmed' }>,
): Extract<AppState, { phase: 'face-shaping' }> {
  const mask: FaceMask = buildInitialMask(state.mosaic.width, state.mosaic.height)
  return { phase: 'face-shaping', crop: state.crop, mosaic: state.mosaic, mask, key: state.key }
}

export function onMaskCellClicked(
  state: Extract<AppState, { phase: 'face-shaping' }>,
  row: number,
  col: number,
): Extract<AppState, { phase: 'face-shaping' }> {
  return { ...state, mask: toggleMaskCell(state.mask, row, col) }
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export function onResetToCrop(_state: AppState, image: FaceImage): AppState {
  return { phase: 'preparing', image }
}

export function onReset(_state: AppState): AppState {
  return { phase: 'idle' }
}
