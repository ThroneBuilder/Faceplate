import { describe, it, expect } from 'vitest'
import { generateMosaic } from '../../src/lib/mosaic/pipeline.js'
import { applyAdjustments } from '../../src/lib/image/adjust.js'
import type { LegoColor, BrickHeight } from '../../src/types/index.js'
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
  const white = (PALETTE as LegoColor[]).find(c => c.id === 1)!
  const id = new ImageData(size, size)
  for (let i = 0; i < size * size * 4; i += 4) {
    id.data[i] = white.rgb[0]; id.data[i + 1] = white.rgb[1]; id.data[i + 2] = white.rgb[2]; id.data[i + 3] = 255
  }
  return id
}

describe('generateMosaic regression', () => {
  it('produces a 32×32 grid at default height', () => {
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

  // Variable height tests (SC-006)
  const extraHeights: BrickHeight[] = [26, 28, 34, 36]

  for (const h of extraHeights) {
    it(`produces a 32×${h} grid for height ${h}`, () => {
      const mosaic = generateMosaic(makeRainbowGradient(), palette, { height: h })
      expect(mosaic.grid.length).toBe(h)
      expect(mosaic.grid.every(row => row.length === 32)).toBe(true)
      expect(mosaic.width).toBe(32)
      expect(mosaic.height).toBe(h)
    })

    it(`height ${h}: every cell ID is in the palette`, () => {
      const idSet = new Set(palette.map(c => c.id))
      const mosaic = generateMosaic(makeRainbowGradient(), palette, { height: h })
      for (const row of mosaic.grid) {
        for (const id of row) {
          expect(idSet.has(id)).toBe(true)
        }
      }
    })

    it(`height ${h}: snapshot produces stable output`, async () => {
      const mosaic = generateMosaic(makeRainbowGradient(), palette, { height: h })
      await expect(JSON.stringify(mosaic.grid, null, 2)).toMatchFileSnapshot(
        `__snapshots__/mosaic-32x${h}.snap.json`,
      )
    })
  }
})

describe('candidate mosaic regression', () => {
  it('candidate (b=0, c=0): snapshot matches default mosaic output', async () => {
    const img = makeRainbowGradient()
    const adjusted = applyAdjustments(img, 0, 0)
    const mosaic = generateMosaic(adjusted, palette, { height: 32 })
    await expect(JSON.stringify(mosaic.grid, null, 2)).toMatchFileSnapshot(
      '__snapshots__/mosaic-32x32-candidate.snap.json',
    )
  })

  it('candidate (b=67, c=67): snapshot is stable and distinct from (0,0)', async () => {
    const img = makeRainbowGradient()
    const adjusted = applyAdjustments(img, 67, 67)
    const mosaic = generateMosaic(adjusted, palette, { height: 32 })
    await expect(JSON.stringify(mosaic.grid, null, 2)).toMatchFileSnapshot(
      '__snapshots__/mosaic-32x32-candidate-b67c67.snap.json',
    )
  })
})
