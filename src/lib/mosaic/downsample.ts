import type { RgbGrid } from '../../types/index.js'
import { PipelineError } from '../../types/index.js'

export function downsampleToGrid(
  imageData: ImageData,
  gridW: number,
  gridH: number,
): RgbGrid {
  const { width, height, data } = imageData

  if (width === 0 || height === 0) {
    throw new PipelineError('INVALID_IMAGE_DATA', 'ImageData has zero dimensions')
  }

  const grid: RgbGrid = []

  for (let row = 0; row < gridH; row++) {
    const gridRow: Array<[number, number, number]> = []

    for (let col = 0; col < gridW; col++) {
      // Source pixel bounds for this grid cell
      const xStart = Math.floor((col / gridW) * width)
      const xEnd   = Math.floor(((col + 1) / gridW) * width)
      const yStart = Math.floor((row / gridH) * height)
      const yEnd   = Math.floor(((row + 1) / gridH) * height)

      let rSum = 0, gSum = 0, bSum = 0, count = 0

      for (let y = yStart; y < yEnd; y++) {
        for (let x = xStart; x < xEnd; x++) {
          const idx = (y * width + x) * 4
          rSum += data[idx]
          gSum += data[idx + 1]
          bSum += data[idx + 2]
          count++
        }
      }

      if (count === 0) count = 1 // guard against empty cells at edge

      gridRow.push([
        Math.round(rSum / count),
        Math.round(gSum / count),
        Math.round(bSum / count),
      ])
    }

    grid.push(gridRow)
  }

  return grid
}
