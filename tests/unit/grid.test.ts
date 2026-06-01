import { describe, it, expect } from 'vitest'
import { computeNextStep, computeGridKeys, buildInitialGrid, buildNextGrid } from '../../src/lib/candidates/grid.js'

describe('computeNextStep', () => {
  it('halves 67 to 33', () => expect(computeNextStep(67)).toBe(33))
  it('halves 33 to 16', () => expect(computeNextStep(33)).toBe(16))
  it('halves 16 to 8',  () => expect(computeNextStep(16)).toBe(8))
  it('halves 2 to 1',   () => expect(computeNextStep(2)).toBe(1))
  it('floors to minimum 1', () => expect(computeNextStep(1)).toBe(1))
})

describe('computeGridKeys', () => {
  it('returns 9 keys', () => {
    const keys = computeGridKeys({ brightnessOffset: 0, contrastOffset: 0 }, 67)
    expect(keys).toHaveLength(9)
  })

  it('index 4 is always the center', () => {
    const center = { brightnessOffset: 10, contrastOffset: -20 }
    const keys = computeGridKeys(center, 50)
    expect(keys[4]).toEqual(center)
  })

  it('produces correct offsets for (0,0) center step=67', () => {
    const keys = computeGridKeys({ brightnessOffset: 0, contrastOffset: 0 }, 67)
    // Row-major: [top-left ... bottom-right] → contrast varies by row, brightness by column
    expect(keys[0]).toEqual({ brightnessOffset: -67, contrastOffset: -67 })
    expect(keys[4]).toEqual({ brightnessOffset: 0,   contrastOffset: 0   })
    expect(keys[8]).toEqual({ brightnessOffset: 67,  contrastOffset: 67  })
  })

  it('clamps values to [-100, 100]', () => {
    const keys = computeGridKeys({ brightnessOffset: 90, contrastOffset: 90 }, 67)
    for (const k of keys) {
      expect(k.brightnessOffset).toBeGreaterThanOrEqual(-100)
      expect(k.brightnessOffset).toBeLessThanOrEqual(100)
      expect(k.contrastOffset).toBeGreaterThanOrEqual(-100)
      expect(k.contrastOffset).toBeLessThanOrEqual(100)
    }
  })

  it('clamps boundary: center=(90,90), step=67 → outer corner clamped to 100', () => {
    const keys = computeGridKeys({ brightnessOffset: 90, contrastOffset: 90 }, 67)
    // top-right corner: B+67=157→100, C-67=23
    const topRight = keys[2]  // row 0, col 2
    expect(topRight.brightnessOffset).toBe(100)
    // bottom-right corner: B+67=100, C+67=157→100
    const bottomRight = keys[8]
    expect(bottomRight.brightnessOffset).toBe(100)
    expect(bottomRight.contrastOffset).toBe(100)
  })
})

describe('buildInitialGrid', () => {
  it('has center (0,0)', () => {
    const g = buildInitialGrid()
    expect(g.center).toEqual({ brightnessOffset: 0, contrastOffset: 0 })
  })

  it('has stepSize equal to DEFAULT_DISTANCE (16)', () => {
    expect(buildInitialGrid().stepSize).toBe(16)
  })

  it('has all cells pending', () => {
    const g = buildInitialGrid()
    for (const cell of g.cells) expect(cell.status).toBe('pending')
  })

  it('cells[4].key matches center', () => {
    const g = buildInitialGrid()
    expect(g.cells[4].key).toEqual(g.center)
  })

  it('atMinimumStep is false', () => {
    expect(buildInitialGrid().atMinimumStep).toBe(false)
  })
})

describe('buildNextGrid', () => {
  it('centers on selectedKey', () => {
    const key = { brightnessOffset: 67, contrastOffset: -33 }
    const g = buildNextGrid(key, 67)
    expect(g.center).toEqual(key)
  })

  it('uses the provided distance as stepSize', () => {
    const g = buildNextGrid({ brightnessOffset: 0, contrastOffset: 0 }, 67)
    expect(g.stepSize).toBe(67)
  })

  it('cells[4].key equals selectedKey', () => {
    const key = { brightnessOffset: 67, contrastOffset: 67 }
    const g = buildNextGrid(key, 67)
    expect(g.cells[4].key).toEqual(key)
  })

  it('atMinimumStep is always false (distance-based navigation)', () => {
    const g = buildNextGrid({ brightnessOffset: 0, contrastOffset: 0 }, 1)
    expect(g.stepSize).toBe(1)
    expect(g.atMinimumStep).toBe(false)
  })

  it('atMinimumStep false when step > 1', () => {
    const g = buildNextGrid({ brightnessOffset: 0, contrastOffset: 0 }, 67)
    expect(g.atMinimumStep).toBe(false)
  })
})
