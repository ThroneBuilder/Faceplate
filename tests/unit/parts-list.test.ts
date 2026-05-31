import { describe, it, expect } from 'vitest'
import { derivePartsList } from '../../src/lib/mosaic/parts-list.js'
import type { Mosaic, LegoColor, BrickHeight } from '../../src/types/index.js'
import PALETTE from '../../src/data/lego-palette.json'

const palette = PALETTE as LegoColor[]

function makeMosaic(colorId: number, height: BrickHeight = 32): Mosaic {
  return {
    grid: Array.from({ length: height }, () => Array.from({ length: 32 }, () => colorId)),
    width: 32,
    height,
    algorithmVersion: '1.0.0',
    mask: null,
  }
}

function makeCheckerMosaic(height: BrickHeight = 32): Mosaic {
  return {
    grid: Array.from({ length: height }, (_, row) =>
      Array.from({ length: 32 }, (_, col) => ((row + col) % 2 === 0 ? 1 : 2)),
    ),
    width: 32,
    height,
    algorithmVersion: '1.0.0',
    mask: null,
  }
}

describe('derivePartsList', () => {
  describe('totalPieces = 32 × brickHeight', () => {
    it('32 × 32 = 1024 for default height', () => {
      expect(derivePartsList(makeMosaic(1, 32), palette).totalPieces).toBe(1024)
    })

    it('32 × 26 = 832 for brickHeight 26', () => {
      expect(derivePartsList(makeMosaic(1, 26), palette).totalPieces).toBe(832)
    })

    it('32 × 36 = 1152 for brickHeight 36', () => {
      expect(derivePartsList(makeMosaic(1, 36), palette).totalPieces).toBe(1152)
    })

    it('totalPieces matches the sum of all entry counts', () => {
      const result = derivePartsList(makeCheckerMosaic(28), palette)
      const sum = result.entries.reduce((s, e) => s + e.count, 0)
      expect(result.totalPieces).toBe(sum)
      expect(result.totalPieces).toBe(32 * 28)
    })
  })

  describe('uniform image edge case', () => {
    it('solid-color mosaic produces exactly 1 entry', () => {
      const result = derivePartsList(makeMosaic(1, 32), palette)
      expect(result.entries.length).toBe(1)
      expect(result.entries[0].count).toBe(1024)
    })
  })

  describe('no duplicate colorIds', () => {
    it('checker mosaic has no duplicate colorId entries', () => {
      const result = derivePartsList(makeCheckerMosaic(), palette)
      const ids = result.entries.map(e => e.colorId)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  describe('sorted descending by count', () => {
    it('entries are sorted largest count first', () => {
      const result = derivePartsList(makeCheckerMosaic(), palette)
      for (let i = 1; i < result.entries.length; i++) {
        expect(result.entries[i].count).toBeLessThanOrEqual(result.entries[i - 1].count)
      }
    })
  })

  describe('rgbHex format', () => {
    it('rgbHex is a valid 7-character hex string', () => {
      const result = derivePartsList(makeMosaic(1), palette)
      expect(result.entries[0].rgbHex).toMatch(/^#[0-9a-f]{6}$/)
    })
  })
})
