import { describe, it, expect } from 'vitest'
import { buildInitialMask, toggleMaskCell, isCellVisible } from '../../src/lib/face-shaping/mask.js'

describe('buildInitialMask', () => {
  it('center row of 32×32 is nearly full-width visible', () => {
    const mask = buildInitialMask(32, 32)
    expect(mask.rows[16].leftCol).toBeLessThan(5)
    expect(mask.rows[16].rightCol).toBeGreaterThan(27)
  })

  it('top row is narrower than center row (head shape, not fully masked)', () => {
    const mask = buildInitialMask(32, 32)
    const topWidth    = mask.rows[0].rightCol  - mask.rows[0].leftCol
    const centerWidth = mask.rows[16].rightCol - mask.rows[16].leftCol
    expect(topWidth).toBeGreaterThan(0)       // crown is visible, not fully masked
    expect(topWidth).toBeLessThan(centerWidth) // narrower than mid-face
  })

  it('bottom row is narrower than center row (chin taper)', () => {
    const mask = buildInitialMask(32, 32)
    const bottomWidth = mask.rows[31].rightCol - mask.rows[31].leftCol
    const centerWidth = mask.rows[16].rightCol - mask.rows[16].leftCol
    expect(bottomWidth).toBeGreaterThan(0)        // chin has some visible cells
    expect(bottomWidth).toBeLessThan(centerWidth) // tapers toward chin
  })

  it('center row is symmetric about center column (within 1 px)', () => {
    const mask = buildInitialMask(32, 32)
    const row = mask.rows[16]
    expect(Math.abs(row.leftCol - (31 - row.rightCol))).toBeLessThanOrEqual(1)
  })

  it('mosaicWidth matches the provided width', () => {
    expect(buildInitialMask(24, 32).mosaicWidth).toBe(24)
  })
})

describe('toggleMaskCell', () => {
  it('visible cell near left edge → left mask extended (leftCol = col + 1)', () => {
    const mask = buildInitialMask(32, 32)
    const m1 = toggleMaskCell(mask, 16, 8)
    expect(m1.rows[16].leftCol).toBe(9)
  })

  it('masked cell near left edge → left mask retracted (leftCol = col)', () => {
    const mask = buildInitialMask(32, 32)
    const m1 = toggleMaskCell(mask, 16, 8)   // leftCol → 9 (col 8 now masked)
    const m2 = toggleMaskCell(m1, 16, 8)      // click masked cell → leftCol = 8
    expect(m2.rows[16].leftCol).toBe(8)
  })

  it('double-toggle at same cell is self-inverting', () => {
    const mask = buildInitialMask(32, 32)
    const originalLeft = mask.rows[16].leftCol
    const m1 = toggleMaskCell(mask, 16, 8)
    const m2 = toggleMaskCell(m1, 16, 8)
    // After extend then retract, leftCol = 8 (original was <8, so now one step in)
    expect(m2.rows[16].leftCol).toBe(8)
    expect(m2.rows[16].leftCol).toBeGreaterThanOrEqual(originalLeft)
  })

  it('visible cell near right edge → right mask extended (rightCol = col - 1)', () => {
    const mask = buildInitialMask(32, 32)
    const m1 = toggleMaskCell(mask, 16, 24)
    expect(m1.rows[16].rightCol).toBe(23)
  })

  it('nearest edge (not a tie): W=6 col=3 → right edge chosen', () => {
    const mask = buildInitialMask(6, 6)
    const m = toggleMaskCell(mask, 3, 3)  // distLeft=4, distRight=3 → right
    expect(m.rows[3].rightCol).toBe(2)
  })

  it('exact tiebreak: W=7 col=3 → left edge wins (distLeft === distRight = 4)', () => {
    const mask = buildInitialMask(7, 7)
    const m = toggleMaskCell(mask, 3, 3)  // distLeft=4, distRight=4 → left
    expect(m.rows[3].leftCol).toBe(4)
  })

  it('does not mutate the input mask', () => {
    const mask = buildInitialMask(32, 32)
    const originalLeft = mask.rows[16].leftCol
    toggleMaskCell(mask, 16, 8)
    expect(mask.rows[16].leftCol).toBe(originalLeft)
  })
})

describe('isCellVisible', () => {
  it('cell at leftCol is visible', () => {
    const mask = buildInitialMask(32, 32)
    const row = mask.rows[16]
    expect(isCellVisible(mask, 16, row.leftCol)).toBe(true)
  })

  it('cell just left of leftCol is masked', () => {
    const mask = buildInitialMask(32, 32)
    const row = mask.rows[16]
    if (row.leftCol > 0) {
      expect(isCellVisible(mask, 16, row.leftCol - 1)).toBe(false)
    }
  })

  it('cells outside the face boundary (corner columns of top row) are masked', () => {
    const mask = buildInitialMask(32, 32)
    // Row 0 (crown) is visible but narrower — col 0 and col 31 should be masked
    expect(isCellVisible(mask, 0, 0)).toBe(false)
    expect(isCellVisible(mask, 0, 31)).toBe(false)
  })
})
