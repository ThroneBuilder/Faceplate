import { describe, it, expect } from 'vitest'
import { applyAdjustments } from '../../src/lib/image/adjust.js'
import { PipelineError } from '../../src/types/index.js'

function solid(r: number, g: number, b: number, a = 255): ImageData {
  const id = new ImageData(2, 2)
  for (let i = 0; i < 4 * 4; i += 4) {
    id.data[i]     = r
    id.data[i + 1] = g
    id.data[i + 2] = b
    id.data[i + 3] = a
  }
  return id
}

describe('applyAdjustments', () => {
  describe('identity at (0, 0)', () => {
    it('returns pixel-identical output at zero offsets', () => {
      const output = applyAdjustments(solid(100, 150, 200), 0, 0)
      expect(output.data[0]).toBe(100)
      expect(output.data[1]).toBe(150)
      expect(output.data[2]).toBe(200)
    })

    it('preserves alpha channel', () => {
      const output = applyAdjustments(solid(100, 150, 200, 128), 0, 0)
      expect(output.data[3]).toBe(128)
    })
  })

  describe('brightness', () => {
    it('increases channel values with positive offset', () => {
      expect(applyAdjustments(solid(100, 100, 100), 50, 0).data[0]).toBe(150)
    })

    it('decreases channel values with negative offset', () => {
      expect(applyAdjustments(solid(100, 100, 100), -50, 0).data[0]).toBe(50)
    })

    it('clamps at 255 for max brightness', () => {
      expect(applyAdjustments(solid(200, 200, 200), 128, 0).data[0]).toBe(255)
    })

    it('clamps at 0 for min brightness', () => {
      expect(applyAdjustments(solid(50, 50, 50), -128, 0).data[0]).toBe(0)
    })
  })

  describe('contrast', () => {
    it('increases spread with positive contrast offset', () => {
      const darkOut  = applyAdjustments(solid(64, 64, 64),   0, 64)
      const lightOut = applyAdjustments(solid(192, 192, 192), 0, 64)
      expect(lightOut.data[0]).toBeGreaterThan(192)
      expect(darkOut.data[0]).toBeLessThan(64)
    })

    it('clamps at 255 for extreme light', () => {
      expect(applyAdjustments(solid(255, 255, 255), 0, 128).data[0]).toBe(255)
    })
  })

  describe('extreme combo (max brightness + max contrast)', () => {
    it('completes without throwing', () => {
      expect(() => applyAdjustments(solid(128, 128, 128), 128, 128)).not.toThrow()
    })
  })

  describe('determinism', () => {
    it('produces identical output for identical input on repeated calls', () => {
      const input = solid(128, 64, 32)
      const out1 = applyAdjustments(input, 30, 20)
      const out2 = applyAdjustments(input, 30, 20)
      expect(Array.from(out1.data)).toEqual(Array.from(out2.data))
    })
  })

  describe('range validation', () => {
    it('throws PipelineError for brightness > 128', () => {
      expect(() => applyAdjustments(solid(100, 100, 100), 129, 0)).toThrow(PipelineError)
    })

    it('throws PipelineError for contrast < -128', () => {
      expect(() => applyAdjustments(solid(100, 100, 100), 0, -129)).toThrow(PipelineError)
    })
  })
})
