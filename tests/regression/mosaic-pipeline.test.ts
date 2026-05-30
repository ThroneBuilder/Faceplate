import { describe, it, expect } from 'vitest'
import { generateMosaic } from '../../src/lib/mosaic/pipeline.js'
import type { LegoColor } from '../../src/types/index.js'
import PALETTE from '../../src/data/lego-palette.json'

const palette = PALETTE as LegoColor[]

function makeRainbowGradient(size = 256): ImageData {
  const id = new ImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      id.data[i]     = Math.floor((x / size) * 255)
      id.data[i + 1] = Math.floor((y / size) * 255)
      id.data[i + 2] = 128
      id.data[i + 3] = 255
    }
  }
  return id
}

function makeSolidWhite(size = 256): ImageData {
  const id = new ImageData(size, size)
  for (let i = 0; i < size * size * 4; i += 4) {
    id.data[i] = 242; id.data[i + 1] = 243; id.data[i + 2] = 242; id.data[i + 3] = 255
  }
  return id
}

describe('generateMosaic regression', () => {
  it('produces a 32×32 grid', () => {
    const mosaic = generateMosaic(makeRainbowGradient(), palette)
    expect(mosaic.grid.length).toBe(32)
    expect(mosaic.grid.every(row => row.length === 32)).toBe(true)
    expect(mosaic.width).toBe(32)
    expect(mosaic.height).toBe(32)
  })

  it('every cell ID is in the palette', () => {
    const idSet = new Set(palette.map(c => c.id))
    const mosaic = generateMosaic(makeRainbowGradient(), palette)
    for (const row of mosaic.grid) {
      for (const id of row) {
        expect(idSet.has(id)).toBe(true)
      }
    }
  })

  it('is deterministic — two calls with identical input produce identical output', () => {
    const img = makeRainbowGradient()
    const m1 = generateMosaic(img, palette)
    const m2 = generateMosaic(img, palette)
    expect(JSON.stringify(m1.grid)).toBe(JSON.stringify(m2.grid))
  })

  it('solid-white image produces a mosaic where all cells share one color', () => {
    const mosaic = generateMosaic(makeSolidWhite(), palette)
    expect(new Set(mosaic.grid.flat()).size).toBe(1)
  })

  it('snapshot: rainbow gradient produces stable output', async () => {
    const mosaic = generateMosaic(makeRainbowGradient(), palette)
    await expect(JSON.stringify(mosaic.grid, null, 2)).toMatchFileSnapshot(
      '__snapshots__/mosaic-32x32.snap.json',
    )
  })
})
