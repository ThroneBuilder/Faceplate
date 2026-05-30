import { describe, it, expect } from 'vitest'
import { derivePartsList } from '../../src/lib/mosaic/parts-list.js'
import type { Mosaic, LegoColor } from '../../src/types/index.js'
import PALETTE from '../../src/data/lego-palette.json'

const palette = PALETTE as LegoColor[]

function makeMosaic(colorId: number): Mosaic {
  // 32×32 mosaic filled with a single color ID
  return {
    grid: Array.from({ length: 32 }, () => Array.from({ length: 32 }, () => colorId)),
    width: 32,
    height: 32,
    algorithmVersion: '1.0.0',
    mask: null,
  }
}

function makeCheckerMosaic(): Mosaic {
  // alternates between color IDs 1 and 2
  return {
    grid: Array.from({ length: 32 }, (_, row) =>
      Array.from({ length: 32 }, (_, col) => ((row + col) % 2 === 0 ? 1 : 2)),
    ),
    width: 32,
    height: 32,
    algorithmVersion: '1.0.0',
    mask: null,
  }
}

describe('derivePartsList', () => {
  describe('totalPieces invariant', () => {
    it('totalPieces always equals 1024 for a 32×32 mosaic', () => {
      const result = derivePartsList(makeMosaic(1), palette)
      expect(result.totalPieces).toBe(1024)
    })

    it('totalPieces equals 1024 for a checker mosaic', () => {
      const result = derivePartsList(makeCheckerMosaic(), palette)
      expect(result.totalPieces).toBe(1024)
    })
  })

  describe('uniform image edge case', () => {
    it('solid-color mosaic produces exactly 1 entry with count 1024', () => {
      const result = derivePartsList(makeMosaic(1), palette)
      expect(result.entries.length).toBe(1)
      expect(result.entries[0].count).toBe(1024)
      expect(result.entries[0].colorId).toBe(1)
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
