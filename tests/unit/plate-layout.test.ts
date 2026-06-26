import { describe, it, expect } from 'vitest'
import { computePlateLayout } from '../../src/lib/mosaic/plate-layout.js'
import type { FaceMask } from '../../src/types/index.js'

function fullMask(rows: number, cols: number): FaceMask {
  return {
    rows: Array.from({ length: rows }, () => ({ leftCol: 0, rightCol: cols - 1 })),
    mosaicWidth: cols,
  }
}

describe('computePlateLayout', () => {
  it('full-rectangle mask produces valid coverage in both layers', () => {
    const result = computePlateLayout(fullMask(32, 32), 32, 32)

    for (let r = 0; r < 32; r++) {
      for (let c = 0; c < 32; c++) {
        expect(result.top[r][c]).toBeGreaterThan(0)
        expect(result.bottom[r][c]).toBeGreaterThan(0)
      }
    }
  })

  it('masked cells produce 0 in both layers', () => {
    const mask: FaceMask = {
      rows: Array.from({ length: 32 }, (_, r) => ({
        leftCol: 0,
        rightCol: r < 16 ? 31 : 15,
      })),
      mosaicWidth: 32,
    }
    const result = computePlateLayout(mask, 32, 32)

    for (let r = 16; r < 32; r++) {
      for (let c = 16; c < 32; c++) {
        expect(result.top[r][c]).toBe(0)
        expect(result.bottom[r][c]).toBe(0)
      }
    }
  })

  it('every non-zero cell maps to a valid plateId in the plates array', () => {
    const result = computePlateLayout(fullMask(26, 32), 32, 26)
    const plateIds = new Set(result.plates.map(p => p.id))

    for (let r = 0; r < 26; r++) {
      for (let c = 0; c < 32; c++) {
        const topId = result.top[r][c]
        const botId = result.bottom[r][c]
        if (topId !== 0) expect(plateIds.has(topId)).toBe(true)
        if (botId !== 0) expect(plateIds.has(botId)).toBe(true)
      }
    }
  })

  it('no plate piece extends outside the mask boundaries', () => {
    const mask: FaceMask = {
      rows: Array.from({ length: 32 }, () => ({ leftCol: 8, rightCol: 23 })),
      mosaicWidth: 32,
    }
    const result = computePlateLayout(mask, 32, 32)

    for (let r = 0; r < 32; r++) {
      for (let c = 0; c < 32; c++) {
        const inMask = c >= 8 && c <= 23
        if (!inMask) {
          expect(result.top[r][c]).toBe(0)
          expect(result.bottom[r][c]).toBe(0)
        }
      }
    }
  })

  it('plates array entries have positive width and height', () => {
    const result = computePlateLayout(fullMask(32, 32), 32, 32)

    for (const plate of result.plates) {
      expect(plate.width).toBeGreaterThan(0)
      expect(plate.height).toBeGreaterThan(0)
    }
  })

  it('plates[id-1].id === id for all plates', () => {
    const result = computePlateLayout(fullMask(32, 32), 32, 32)

    for (const plate of result.plates) {
      expect(result.plates[plate.id - 1]!.id).toBe(plate.id)
    }
  })
})
