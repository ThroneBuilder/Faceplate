import { describe, it, expect } from 'vitest'
import { computeCropGeometry, clampHandles, scaleToBrickHeight } from '../../src/lib/crop/head-crop.js'
import type { BrickHeight } from '../../src/types/index.js'

const ALL_HEIGHTS: BrickHeight[] = [26, 28, 30, 32, 34, 36]

describe('computeCropGeometry', () => {
  describe('horizontal centering', () => {
    it('leftX === (imageWidth - cropWidthPx) / 2 for all heights', () => {
      for (const h of ALL_HEIGHTS) {
        const g = computeCropGeometry(0, 320, 480, h)
        expect(g.leftX).toBe(Math.round((480 - g.cropWidthPx) / 2))
      }
    })

    it('rightX === leftX + cropWidthPx', () => {
      for (const h of ALL_HEIGHTS) {
        const g = computeCropGeometry(50, 250, 400, h)
        expect(g.rightX).toBe(g.leftX + g.cropWidthPx)
      }
    })
  })

  describe('aspect ratio', () => {
    it.each(ALL_HEIGHTS)('cropWidthPx / cropHeightPx ≈ 32 / %i', h => {
      const g = computeCropGeometry(0, 320, 500, h)
      const ratio = g.cropWidthPx / g.cropHeightPx
      const expected = 32 / h
      expect(Math.abs(ratio - expected)).toBeLessThan(0.02) // within 2% due to rounding
    })
  })

  describe('height preserved', () => {
    it('cropHeightPx === bottomY - topY', () => {
      const g = computeCropGeometry(40, 200, 400, 32)
      expect(g.cropHeightPx).toBe(160)
    })
  })

  describe('square at default height 32', () => {
    it('cropWidthPx ≈ cropHeightPx when brickHeight is 32', () => {
      const g = computeCropGeometry(0, 200, 400, 32)
      expect(Math.abs(g.cropWidthPx - g.cropHeightPx)).toBeLessThanOrEqual(1)
    })
  })
})

describe('clampHandles', () => {
  it('does not exceed image bounds', () => {
    const { topY, bottomY } = clampHandles(-50, 600, 500)
    expect(topY).toBeGreaterThanOrEqual(0)
    expect(bottomY).toBeLessThanOrEqual(500)
  })

  it('topY < bottomY always', () => {
    const { topY, bottomY } = clampHandles(300, 100, 500)
    expect(topY).toBeLessThan(bottomY)
  })

  it('enforces minHeightPx default of 100', () => {
    const { topY, bottomY } = clampHandles(490, 495, 500)
    expect(bottomY - topY).toBeGreaterThanOrEqual(100)
  })

  it('enforces custom minHeightPx', () => {
    const { topY, bottomY } = clampHandles(100, 110, 500, 50)
    expect(bottomY - topY).toBeGreaterThanOrEqual(50)
  })

  it('valid handles pass through unchanged', () => {
    const { topY, bottomY } = clampHandles(100, 400, 500)
    expect(topY).toBe(100)
    expect(bottomY).toBe(400)
  })
})

describe('scaleToBrickHeight', () => {
  it('center of crop is preserved after scaling', () => {
    const top = 100, bot = 300  // center = 200
    const { topY, bottomY } = scaleToBrickHeight(top, bot, 500, 32, 32)
    // no change when fromHeight === toHeight
    expect(topY).toBe(top)
    expect(bottomY).toBe(bot)
  })

  it('scaling to more bricks increases crop height', () => {
    const { topY, bottomY } = scaleToBrickHeight(100, 300, 600, 32, 36)
    expect(bottomY - topY).toBeGreaterThan(200)
  })

  it('scaling to fewer bricks decreases crop height', () => {
    const { topY, bottomY } = scaleToBrickHeight(100, 300, 600, 32, 28)
    expect(bottomY - topY).toBeLessThan(200)
  })

  it('result stays within image bounds', () => {
    const { topY, bottomY } = scaleToBrickHeight(0, 480, 480, 26, 36)
    expect(topY).toBeGreaterThanOrEqual(0)
    expect(bottomY).toBeLessThanOrEqual(480)
  })
})
