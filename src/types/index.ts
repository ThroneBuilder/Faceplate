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
  width?: 32
  height?: BrickHeight
  algorithmVersion?: string
}

export interface Mosaic {
  grid: number[][]
  width: 32
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
  // Downstream phases (unchanged)
  | { phase: 'adjusting'; crop: HeadCropSelection; brightness: number; contrast: number }
  | { phase: 'generating'; adjusted: AdjustedImage }
  | { phase: 'result'; mosaic: Mosaic; adjusted: AdjustedImage; crop: HeadCropSelection }

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
