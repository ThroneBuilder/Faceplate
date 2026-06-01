import { describe, it, expect } from 'vitest'
import { createHistory, pushHistory, revertHistory, activeEntry } from '../../src/lib/candidates/history.js'
import type { CandidateKey } from '../../src/types/index.js'

const k0: CandidateKey = { brightnessOffset: 0, contrastOffset: 0 }
const k1: CandidateKey = { brightnessOffset: 67, contrastOffset: 67 }
const k2: CandidateKey = { brightnessOffset: 33, contrastOffset: 33 }

describe('createHistory', () => {
  it('starts with one entry', () => {
    const h = createHistory(k0, 67)
    expect(h.entries).toHaveLength(1)
    expect(h.entries[0].key).toEqual(k0)
    expect(h.activeIndex).toBe(0)
  })
})

describe('pushHistory', () => {
  it('appends a new entry', () => {
    const h = createHistory(k0, 67)
    const h2 = pushHistory(h, k1, 67)
    expect(h2.entries).toHaveLength(2)
    expect(h2.activeIndex).toBe(1)
    expect(h2.entries[1].key).toEqual(k1)
  })

  it('discards forward entries after a revert before pushing', () => {
    const h0 = createHistory(k0, 67)
    const h1 = pushHistory(h0, k1, 67)
    const h2 = pushHistory(h1, k2, 33)
    const hReverted = revertHistory(h2, 1)  // revert to k1
    const hNew = pushHistory(hReverted, k2, 33)
    expect(hNew.entries).toHaveLength(3)   // k0, k1, k2 (k2 from before replaced)
    expect(hNew.activeIndex).toBe(2)
  })

  it('preserves existing entries before active point', () => {
    const h0 = createHistory(k0, 67)
    const h1 = pushHistory(h0, k1, 67)
    expect(h1.entries[0].key).toEqual(k0)
    expect(h1.entries[1].key).toEqual(k1)
  })
})

describe('revertHistory', () => {
  it('sets activeIndex without truncating forward entries', () => {
    const h0 = createHistory(k0, 67)
    const h1 = pushHistory(h0, k1, 67)
    const h2 = pushHistory(h1, k2, 33)
    const hReverted = revertHistory(h2, 0)
    expect(hReverted.activeIndex).toBe(0)
    expect(hReverted.entries).toHaveLength(3)  // all 3 entries preserved
  })

  it('can revert to any index', () => {
    const h0 = createHistory(k0, 67)
    const h1 = pushHistory(h0, k1, 67)
    const h2 = pushHistory(h1, k2, 33)
    const hReverted = revertHistory(h2, 1)
    expect(hReverted.activeIndex).toBe(1)
    expect(hReverted.entries).toHaveLength(3)
  })

  it('re-advancing after revert discards forward entries', () => {
    const h0 = createHistory(k0, 67)
    const h1 = pushHistory(h0, k1, 67)
    const h2 = pushHistory(h1, k2, 33)
    const hReverted = revertHistory(h2, 0)  // back to k0
    const hForward = pushHistory(hReverted, k2, 67)  // choose k2 from k0
    expect(hForward.entries).toHaveLength(2)  // k0 + k2; k1 and old k2 discarded
    expect(hForward.entries[1].key).toEqual(k2)
    expect(hForward.activeIndex).toBe(1)
  })
})

describe('activeEntry', () => {
  it('returns the entry at activeIndex', () => {
    const h0 = createHistory(k0, 67)
    const h1 = pushHistory(h0, k1, 67)
    expect(activeEntry(h1).key).toEqual(k1)
  })

  it('after revert, returns reverted-to entry', () => {
    const h0 = createHistory(k0, 67)
    const h1 = pushHistory(h0, k1, 67)
    const hReverted = revertHistory(h1, 0)
    expect(activeEntry(hReverted).key).toEqual(k0)
  })
})
