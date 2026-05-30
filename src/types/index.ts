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

export interface FaceImage {
  file: File
  format: 'jpeg' | 'png'
  widthPx: number
  heightPx: number
  fileSizeBytes: number
  objectUrl: string
}

export interface CropSelection {
  x: number
  y: number
  widthPx: number
  heightPx: number
  imageData: ImageData
}

export interface AdjustedImage {
  source: CropSelection
  brightnessOffset: number
  contrastOffset: number
  imageData: ImageData
}

export interface MosaicOptions {
  width?: 32
  height?: 32
  algorithmVersion?: string
}

export interface Mosaic {
  grid: number[][]
  width: 32
  height: 32
  algorithmVersion: string
  inputHash?: string
  pieceType?: '1x1-plate'
  mask?: boolean[][] | null
}

export type LegoColorId = number

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

export type AppState =
  | { phase: 'idle' }
  | { phase: 'uploading' }
  | { phase: 'upload-error'; error: string }
  | { phase: 'cropping'; image: FaceImage }
  | { phase: 'crop-error'; image: FaceImage; error: string }
  | { phase: 'adjusting'; crop: CropSelection; brightness: number; contrast: number }
  | { phase: 'generating'; adjusted: AdjustedImage }
  | { phase: 'result'; mosaic: Mosaic; adjusted: AdjustedImage; crop: CropSelection }

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
