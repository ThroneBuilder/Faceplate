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
  CandidateKey,
  MosaicCandidate,
  SelectionHistory,
  CandidateCache,
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

// ─── Candidate grid (Phase 2A/2B) ────────────────────────────────────────────

const INITIAL_STEP = 67  // Math.round(100 * 2 / 3)

function makePendingCell(key: CandidateKey): MosaicCandidate {
  return { key, status: 'pending' }
}

function buildInitialGrid(): CandidateGrid {
  const center: CandidateKey = { brightnessOffset: 0, contrastOffset: 0 }
  const step = INITIAL_STEP
  const offsets = [-step, 0, step] as const
  const cells = offsets.flatMap(c =>
    offsets.map(b => makePendingCell({ brightnessOffset: clampKey(b), contrastOffset: clampKey(c) }))
  ) as CandidateGrid['cells']
  return { center, stepSize: step, cells, atMinimumStep: false }
}

function clampKey(v: number): number {
  return Math.max(-100, Math.min(100, v))
}

export function onCropConfirmed(
  _state: { phase: 'head-cropping' | 'head-crop-error' },
  crop: HeadCropSelection,
): Extract<AppState, { phase: 'candidate-grid' }> {
  const grid = buildInitialGrid()
  const initialKey = grid.center
  const history: SelectionHistory = {
    entries: [{ key: initialKey, stepSize: grid.stepSize, chosenAt: Date.now() }],
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
): Extract<AppState, { phase: 'candidate-grid' }> {
  if (cellIndex === 4) return state  // center cell — no-op
  const cell = state.grid.cells[cellIndex]
  if (cell.status !== 'ready') return state  // not interactive yet

  const selectedKey = cell.key
  const nextStep = Math.max(1, Math.floor(state.grid.stepSize / 2))
  const offsets = [-nextStep, 0, nextStep] as const
  const cells = offsets.flatMap(c =>
    offsets.map(b => makePendingCell({
      brightnessOffset: clampKey(selectedKey.brightnessOffset + b),
      contrastOffset: clampKey(selectedKey.contrastOffset + c),
    }))
  ) as CandidateGrid['cells']
  cells[4] = { ...cells[4], status: 'pending' }  // center is the chosen key

  const newGrid: CandidateGrid = {
    center: selectedKey,
    stepSize: nextStep,
    cells,
    atMinimumStep: nextStep === 1,
  }

  // Hydrate from cache
  for (let i = 0; i < 9; i++) {
    const cacheKey = `${cells[i].key.brightnessOffset}:${cells[i].key.contrastOffset}`
    const cached = state.cache.get(cacheKey)
    if (cached) {
      newGrid.cells[i] = { ...newGrid.cells[i], status: 'ready', mosaic: cached }
    }
  }

  const prevEntries = state.history.entries.slice(0, state.history.activeIndex + 1)
  const newHistory: SelectionHistory = {
    entries: [...prevEntries, { key: selectedKey, stepSize: state.grid.stepSize, chosenAt: Date.now() }],
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

  const step = entry.stepSize
  const offsets = [-step, 0, step] as const
  const cells = offsets.flatMap(c =>
    offsets.map(b => {
      const key: CandidateKey = {
        brightnessOffset: clampKey(entry.key.brightnessOffset + b),
        contrastOffset: clampKey(entry.key.contrastOffset + c),
      }
      const cacheKey = `${key.brightnessOffset}:${key.contrastOffset}`
      const cached = state.cache.get(cacheKey)
      return cached
        ? { key, status: 'ready' as const, mosaic: cached }
        : makePendingCell(key)
    })
  ) as CandidateGrid['cells']

  const newGrid: CandidateGrid = {
    center: entry.key,
    stepSize: step,
    cells,
    atMinimumStep: step === 1,
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

// ─── Navigation ───────────────────────────────────────────────────────────────

export function onResetToCrop(_state: AppState, image: FaceImage): AppState {
  return { phase: 'preparing', image }
}

export function onReset(_state: AppState): AppState {
  return { phase: 'idle' }
}
