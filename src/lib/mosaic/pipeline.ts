import type { Mosaic, LegoColor, MosaicOptions, BrickHeight } from '../../types/index.js'
import { PipelineError } from '../../types/index.js'
import { downsampleToGrid } from './downsample.js'
import { matchColors } from './color-match.js'

const ALGORITHM_VERSION = '1.0.0'
const GRID_WIDTH = 32

export function generateMosaic(
  imageData: ImageData,
  palette: LegoColor[],
  options?: MosaicOptions,
): Mosaic {
  if (palette.length === 0) {
    throw new PipelineError('EMPTY_PALETTE', 'Palette must contain at least one color')
  }

  const width  = options?.width  ?? GRID_WIDTH
  const height = (options?.height ?? GRID_WIDTH) as BrickHeight

  const grid = downsampleToGrid(imageData, width, height)
  const colorIds = matchColors(grid, palette)

  return {
    grid: colorIds,
    width,
    height,
    algorithmVersion: options?.algorithmVersion ?? ALGORITHM_VERSION,
    pieceType: '1x1-plate',
    mask: null,
  }
}
