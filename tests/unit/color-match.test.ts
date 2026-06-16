import { describe, it, expect } from 'vitest'
import { matchColors } from '../../src/lib/mosaic/color-match.js'
import { PipelineError } from '../../src/types/index.js'
import type { LegoColor, RgbGrid } from '../../src/types/index.js'
import PALETTE from '../../src/data/lego-palette.json'

const palette = PALETTE as LegoColor[]
const paletteIdSet = new Set(palette.map(c => c.id))

function makeGrid(w: number, h: number, r: number, g: number, b: number): RgbGrid {
  return Array.from({ length: h }, () =>
    Array.from({ length: w }, () => [r, g, b] as [number, number, number]),
  )
}

describe('matchColors', () => {
  describe('output dimensions', () => {
    it('output has same dimensions as input grid', () => {
      const grid = makeGrid(32, 32, 100, 150, 200)
      const result = matchColors(grid, palette)
      expect(result.length).toBe(32)
      expect(result.every(row => row.length === 32)).toBe(true)
    })

    it('handles non-square grids', () => {
      const grid = makeGrid(4, 8, 50, 50, 50)
      const result = matchColors(grid, palette)
      expect(result.length).toBe(8)
      expect(result[0].length).toBe(4)
    })
  })

  describe('palette containment', () => {
    it('every output cell value is a valid palette ID', () => {
      const grid = makeGrid(32, 32, 128, 64, 200)
      const result = matchColors(grid, palette)
      for (const row of result) {
        for (const id of row) {
          expect(paletteIdSet.has(id)).toBe(true)
        }
      }
    })
  })

  describe('determinism', () => {
    it('same grid + same palette → identical output', () => {
      const grid = makeGrid(8, 8, 90, 120, 60)
      const r1 = matchColors(grid, palette)
      const r2 = matchColors(grid, palette)
      expect(JSON.stringify(r1)).toBe(JSON.stringify(r2))
    })
  })

  describe('nearest-color sanity', () => {
    it('white input maps to White (id 1)', () => {
      const white = palette.find(c => c.id === 1)!
      const grid = makeGrid(1, 1, white.rgb[0], white.rgb[1], white.rgb[2])
      const [[id]] = matchColors(grid, palette)
      expect(id).toBe(1)
    })

    it('black input maps to Black (id 2)', () => {
      const black = palette.find(c => c.id === 2)!
      const grid = makeGrid(1, 1, black.rgb[0], black.rgb[1], black.rgb[2])
      const [[id]] = matchColors(grid, palette)
      expect(id).toBe(2)
    })
  })

  describe('error handling', () => {
    it('throws PipelineError for empty palette', () => {
      const grid = makeGrid(4, 4, 100, 100, 100)
      expect(() => matchColors(grid, [])).toThrow(PipelineError)
    })
  })
})
