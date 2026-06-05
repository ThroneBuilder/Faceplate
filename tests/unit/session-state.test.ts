import { describe, it, expect } from 'vitest'
import { serialiseSession, isExpired, SESSION_EXPIRY_MS } from '../../src/lib/session/session-state.js'

const cropParams = {
  topY: 0, bottomY: 400,
  leftX: 0, rightX: 300,
  cropWidthPx: 300, cropHeightPx: 400,
  brickHeight: 32 as const,
}
const candidateKey = { brightnessOffset: 10, contrastOffset: -5 }
const maskRows = [{ leftCol: 2, rightCol: 29 }]
const mosaicGrid = [[1, 2], [3, 4]]

describe('serialiseSession', () => {
  it('populates all required fields', () => {
    const meta = serialiseSession(cropParams, candidateKey, 16, mosaicGrid, 32, 32, maskRows)
    expect(meta.version).toBe(1)
    expect(meta.cropParams).toEqual(cropParams)
    expect(meta.candidateKey).toEqual(candidateKey)
    expect(meta.distance).toBe(16)
    expect(meta.mosaicGrid).toEqual(mosaicGrid)
    expect(meta.mosaicWidth).toBe(32)
    expect(meta.mosaicHeight).toBe(32)
    expect(meta.maskRows).toEqual(maskRows)
    expect(typeof meta.savedAt).toBe('number')
    expect(meta.savedAt).toBeGreaterThan(0)
  })
})

describe('isExpired', () => {
  it('returns false for a fresh session (savedAt = now)', () => {
    const meta = serialiseSession(cropParams, candidateKey, 16, mosaicGrid, 32, 32, maskRows)
    expect(isExpired(meta)).toBe(false)
  })

  it('returns true for a session older than 30 days', () => {
    const meta = serialiseSession(cropParams, candidateKey, 16, mosaicGrid, 32, 32, maskRows)
    const old = { ...meta, savedAt: Date.now() - (SESSION_EXPIRY_MS + 1) }
    expect(isExpired(old)).toBe(true)
  })

  it('returns true at exactly the expiry threshold', () => {
    const meta = serialiseSession(cropParams, candidateKey, 16, mosaicGrid, 32, 32, maskRows)
    const boundary = { ...meta, savedAt: Date.now() - SESSION_EXPIRY_MS }
    expect(isExpired(boundary)).toBe(true)
  })

  it('returns false for a session 1 ms before expiry', () => {
    const meta = serialiseSession(cropParams, candidateKey, 16, mosaicGrid, 32, 32, maskRows)
    const nearBoundary = { ...meta, savedAt: Date.now() - SESSION_EXPIRY_MS + 1 }
    expect(isExpired(nearBoundary)).toBe(false)
  })
})
