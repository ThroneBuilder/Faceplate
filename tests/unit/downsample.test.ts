import { describe, it, expect } from 'vitest'
import { downsampleToGrid } from '../../src/lib/mosaic/downsample.js'

function makeGradient(w: number, h: number): ImageData {
  const id = new ImageData(w, h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      id.data[i]     = Math.floor((x / w) * 255)
      id.data[i + 1] = Math.floor((y / h) * 255)
      id.data[i + 2] = 128
      id.data[i + 3] = 255
    }
  }
  return id
}

function makeSolid(w: number, h: number, r: number, g: number, b: number): ImageData {
  const id = new ImageData(w, h)
  for (let i = 0; i < w * h * 4; i += 4) {
    id.data[i] = r; id.data[i + 1] = g; id.data[i + 2] = b; id.data[i + 3] = 255
  }
  return id
}

describe('downsampleToGrid', () => {
  describe('output dimensions', () => {
    it('produces a 32×32 grid from a 256×256 image', () => {
      const grid = downsampleToGrid(makeGradient(256, 256), 32, 32)
      expect(grid.length).toBe(32)
      expect(grid.every(row => row.length === 32)).toBe(true)
    })

    it('produces a 32×32 grid from a non-square image (320×200)', () => {
      const grid = downsampleToGrid(makeGradient(320, 200), 32, 32)
      expect(grid.length).toBe(32)
      expect(grid.every(row => row.length === 32)).toBe(true)
    })

    it('produces a 4×4 grid when requested', () => {
      const grid = downsampleToGrid(makeGradient(128, 128), 4, 4)
      expect(grid.length).toBe(4)
      expect(grid[0].length).toBe(4)
    })
  })

  describe('RGB value ranges', () => {
    it('all R values are in [0, 255]', () => {
      const grid = downsampleToGrid(makeGradient(256, 256), 32, 32)
      expect(grid.flat().map(([r]) => r).every(v => v >= 0 && v <= 255)).toBe(true)
    })

    it('all G values are in [0, 255]', () => {
      const grid = downsampleToGrid(makeGradient(256, 256), 32, 32)
      expect(grid.flat().map(([, g]) => g).every(v => v >= 0 && v <= 255)).toBe(true)
    })
  })

  describe('averaging correctness', () => {
    it('solid-color image produces the same RGB in every cell', () => {
      const grid = downsampleToGrid(makeSolid(256, 256, 200, 100, 50), 32, 32)
      for (const row of grid) {
        for (const [r, g, b] of row) {
          expect(r).toBe(200)
          expect(g).toBe(100)
          expect(b).toBe(50)
        }
      }
    })
  })

  describe('determinism', () => {
    it('produces identical output for identical ImageData', () => {
      const img = makeGradient(256, 256)
      expect(JSON.stringify(downsampleToGrid(img, 32, 32)))
        .toBe(JSON.stringify(downsampleToGrid(img, 32, 32)))
    })
  })
})
