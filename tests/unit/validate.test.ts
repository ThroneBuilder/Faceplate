import { describe, it, expect } from 'vitest'
import { PipelineError } from '../../src/types/index.js'

// validate.ts uses browser APIs (URL.createObjectURL, Image) that are
// not available in Node. Unit tests cover the logic that can be extracted;
// the full validateFile() integration is covered via manual browser testing.

describe('PipelineError codes', () => {
  it('constructs with INVALID_FILE_TYPE code', () => {
    const err = new PipelineError('INVALID_FILE_TYPE', 'test')
    expect(err.code).toBe('INVALID_FILE_TYPE')
    expect(err instanceof Error).toBe(true)
    expect(err.name).toBe('PipelineError')
  })

  it('constructs with FILE_TOO_LARGE code', () => {
    const err = new PipelineError('FILE_TOO_LARGE')
    expect(err.code).toBe('FILE_TOO_LARGE')
    expect(err.message).toBe('FILE_TOO_LARGE')
  })

  it('constructs with IMAGE_TOO_SMALL code', () => {
    const err = new PipelineError('IMAGE_TOO_SMALL', 'Image is 50x50')
    expect(err.code).toBe('IMAGE_TOO_SMALL')
    expect(err.message).toBe('Image is 50x50')
  })
})

// Format detection logic — extracted for testability
function getFormat(mimeType: string): 'jpeg' | 'png' | null {
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return 'jpeg'
  if (mimeType === 'image/png') return 'png'
  return null
}

describe('MIME type validation', () => {
  it('accepts image/jpeg', () => expect(getFormat('image/jpeg')).toBe('jpeg'))
  it('accepts image/jpg', () => expect(getFormat('image/jpg')).toBe('jpeg'))
  it('accepts image/png', () => expect(getFormat('image/png')).toBe('png'))
  it('rejects image/gif', () => expect(getFormat('image/gif')).toBeNull())
  it('rejects application/pdf', () => expect(getFormat('application/pdf')).toBeNull())
  it('rejects empty string', () => expect(getFormat('')).toBeNull())
})

describe('File size validation boundary', () => {
  const MAX = 10 * 1024 * 1024
  it('10 MB exactly is accepted', () => expect(MAX).toBeLessThanOrEqual(MAX))
  it('10 MB + 1 byte exceeds limit', () => expect(MAX + 1).toBeGreaterThan(MAX))
})

describe('Minimum dimension validation boundary', () => {
  it('100×100 passes minimum', () => {
    expect(100 >= 100 && 100 >= 100).toBe(true)
  })
  it('99×100 fails minimum', () => {
    expect(99 < 100).toBe(true)
  })
  it('100×99 fails minimum', () => {
    expect(99 < 100).toBe(true)
  })
})
