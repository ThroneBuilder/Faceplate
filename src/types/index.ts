// ─── Brick height ─────────────────────────────────────────────────────────────
export type BrickHeight = 26 | 28 | 30 | 32 | 34 | 36

// ─── Palette ──────────────────────────────────────────────────────────────────
export interface LegoColor {
  id: number
  name: string
  rgb: [number, number, number]
  brickLinkColorId?: number
  brickLinkColorName?: string
  available1x1Plate?: boolean
  studioColorId?: number
  hexCode?: string
}

// ─── Image acquisition ────────────────────────────────────────────────────────
export interface FaceImage {
  file: File
  format: 'jpeg' | 'png'
  widthPx: number
  heightPx: number
  fileSizeBytes: number
  objectUrl: string
}

// ─── Camera ───────────────────────────────────────────────────────────────────
export interface CameraSession {
  stream: MediaStream
  activeDeviceId: string
  availableDevices: MediaDeviceInfo[]
  permissionState: 'granted' | 'denied' | 'prompt'
  preferredFacing?: 'user' | 'environment'
}

export interface CapturedPhoto {
  blob: Blob
  widthPx: number
  heightPx: number
  capturedAt: number
}

// ─── Head detection ───────────────────────────────────────────────────────────
export interface HeadBounds {
  topY: number
  bottomY: number
  leftX?: number   // detected left face edge (image pixels); undefined = use full width
  rightX?: number  // detected right face edge (image pixels); undefined = use full width
  detectionStatus: 'found' | 'not-found' | 'too-small'
  landmarkData?: unknown
}

// ─── Crop ─────────────────────────────────────────────────────────────────────
export interface CropGeometry {
  topY: number
  bottomY: number
  leftX: number
  rightX: number
  cropWidthPx: number
  cropHeightPx: number
}

export interface HeadCropSelection {
  topY: number
  bottomY: number
  leftX: number
  rightX: number
  cropWidthPx: number
  cropHeightPx: number
  brickHeight: BrickHeight
  brickWidth: number
  imageData: ImageData
}

/** @deprecated Use HeadCropSelection. Retained for Phase 1A compatibility. */
export interface CropSelection {
  x: number
  y: number
  widthPx: number
  heightPx: number
  imageData: ImageData
}

// ─── Adjustment ───────────────────────────────────────────────────────────────
export interface AdjustedImage {
  source: HeadCropSelection
  brightnessOffset: number
  contrastOffset: number
  imageData: ImageData
}

// ─── Mosaic ───────────────────────────────────────────────────────────────────
export interface MosaicOptions {
  width?: number
  height?: BrickHeight
  algorithmVersion?: string
  brightnessOffset?: number
  contrastOffset?: number
}

export interface Mosaic {
  grid: number[][]
  width: number
  height: BrickHeight
  algorithmVersion: string
  inputHash?: string
  pieceType?: '1x1-plate'
  mask?: boolean[][] | null
}

export type LegoColorId = number

// ─── Color outputs ────────────────────────────────────────────────────────────
export interface ColorMatrix {
  cells: string[][]
}

export interface PartsListEntry {
  colorId: number
  colorName: string
  count: number
  rgbHex: string
  brickLinkColorId?: number
  brickLinkUrl?: string
  studioColorId?: number
}

export interface PartsList {
  entries: PartsListEntry[]
  totalPieces: number
}

export type RgbGrid = Array<Array<[number, number, number]>>

// ─── Face shaping mask ────────────────────────────────────────────────────────
export interface FaceMaskRow {
  leftCol: number   // first visible column (inclusive); leftCol > rightCol means fully masked
  rightCol: number  // last visible column (inclusive)
}

export interface FaceMask {
  rows: FaceMaskRow[]  // length === mosaic.height; index i = mosaic row i
  mosaicWidth: number
}

// ─── Candidate grid ───────────────────────────────────────────────────────────

export interface CandidateKey {
  brightnessOffset: number  // integer, −100 to 100
  contrastOffset: number    // integer, −100 to 100
}

export interface MosaicCandidate {
  key: CandidateKey
  status: 'pending' | 'ready' | 'error'
  mosaic?: Mosaic
  errorMessage?: string
  durationMs?: number
}

export interface CandidateGrid {
  center: CandidateKey
  stepSize: number
  cells: [
    MosaicCandidate, MosaicCandidate, MosaicCandidate,
    MosaicCandidate, MosaicCandidate, MosaicCandidate,
    MosaicCandidate, MosaicCandidate, MosaicCandidate,
  ]
  atMinimumStep: boolean
}

export interface HistoryEntry {
  key: CandidateKey
  stepSize: number
  chosenAt: number
}

export interface SelectionHistory {
  entries: HistoryEntry[]
  activeIndex: number
}

export type CandidateCache = Map<string, Mosaic>

export interface WorkerInput {
  index: number
  imageBuffer: ArrayBuffer
  imageWidth: number
  imageHeight: number
  brightnessOffset: number
  contrastOffset: number
  palette: LegoColor[]
  width: number
  height: BrickHeight
}

export interface WorkerOutput {
  index: number
  mosaic?: Mosaic
  error?: string
  durationMs?: number
}

// ─── App state ────────────────────────────────────────────────────────────────
export type AppState =
  // Existing upload phases
  | { phase: 'idle' }
  | { phase: 'uploading' }
  | { phase: 'upload-error'; error: string }
  // Camera capture phases (Phase 1B)
  | { phase: 'camera-viewfinder'; session: CameraSession }
  | { phase: 'camera-preview'; photo: CapturedPhoto; session: CameraSession }
  | { phase: 'camera-error'; error: string }
  // Pre-crop preparation (EXIF + head detection)
  | { phase: 'preparing'; image: FaceImage }
  // Seeded manual head-height crop (replaces Phase 1A 'cropping')
  | { phase: 'head-cropping'; image: FaceImage; headBounds: HeadBounds; brickHeight: BrickHeight }
  | { phase: 'head-crop-error'; image: FaceImage; headBounds: HeadBounds; error: string }
  // Candidate grid (Phase 2A/2B — replaces adjusting/generating in happy path)
  | {
      phase: 'candidate-grid'
      crop: HeadCropSelection
      grid: CandidateGrid
      history: SelectionHistory
      cache: CandidateCache
      generationAbortController?: AbortController
    }
  | {
      phase: 'mosaic-confirmed'
      crop: HeadCropSelection
      mosaic: Mosaic
      key: CandidateKey
    }
  | {
      phase: 'face-shaping'
      crop: HeadCropSelection
      mosaic: Mosaic
      mask: FaceMask
      key: CandidateKey
    }
  // Downstream phases (retained for backward compatibility)
  /** @deprecated Use candidate-grid instead */
  | { phase: 'adjusting'; crop: HeadCropSelection; brightness: number; contrast: number }
  /** @deprecated Use candidate-grid instead */
  | { phase: 'generating'; adjusted: AdjustedImage }
  | { phase: 'result'; mosaic: Mosaic; adjusted: AdjustedImage; crop: HeadCropSelection }

// ─── Backing plate layout (Phase 007) ────────────────────────────────────────

export interface PlateSpec {
  id: number      // 1-indexed
  width: number   // studs wide
  height: number  // studs tall
}

export interface PlateLayoutResult {
  top: number[][]     // [row][col] → plateId (1-indexed); 0 = masked
  bottom: number[][]  // [row][col] → plateId (1-indexed); 0 = masked
  plates: PlateSpec[] // plates[id-1] gives spec for that plateId
}

// ─── Session persistence (Phase 005) ─────────────────────────────────────────

export interface SessionMetadata {
  version: 1
  savedAt: number
  cropParams: {
    topY: number; bottomY: number
    leftX: number; rightX: number
    cropWidthPx: number; cropHeightPx: number
    brickHeight: BrickHeight
    brickWidth: number
  }
  candidateKey: { brightnessOffset: number; contrastOffset: number }
  distance: number
  mosaicGrid: number[][]
  mosaicWidth: number
  mosaicHeight: BrickHeight
  maskRows: Array<{ leftCol: number; rightCol: number }>
}

export interface PersistedSession {
  metadata: SessionMetadata
  imageBlob: Blob
}

// ─── Gallery (Phase 005) ──────────────────────────────────────────────────────

export interface GalleryResponse {
  success: true
  redirectUrl: string
}

export interface GalleryErrorResponse {
  success: false
  error: string
}

// ─── Errors ───────────────────────────────────────────────────────────────────
export type PipelineErrorCode =
  | 'EMPTY_PALETTE'
  | 'INVALID_IMAGE_DATA'
  | 'INVALID_ADJUSTMENT_RANGE'
  | 'IMAGE_TOO_SMALL'
  | 'INVALID_FILE_TYPE'
  | 'FILE_TOO_LARGE'

export class PipelineError extends Error {
  readonly code: PipelineErrorCode

  constructor(code: PipelineErrorCode, message?: string) {
    super(message ?? code)
    this.code = code
    this.name = 'PipelineError'
  }
}
