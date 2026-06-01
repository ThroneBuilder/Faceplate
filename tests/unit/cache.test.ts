import { describe, it, expect } from 'vitest'
import { candidateCacheKey, getCached, putCached, hydrateGridFromCache } from '../../src/lib/candidates/cache.js'
import { buildInitialGrid } from '../../src/lib/candidates/grid.js'
import type { CandidateCache, Mosaic } from '../../src/types/index.js'

function fakeMosaic(tag = 0): Mosaic {
  return { grid: [[tag]], width: 32, height: 32, algorithmVersion: '1.0.0', pieceType: '1x1-plate', mask: null }
}

describe('candidateCacheKey', () => {
  it('formats as "b:c"', () => {
    expect(candidateCacheKey({ brightnessOffset: 67, contrastOffset: -33 })).toBe('67:-33')
  })
  it('handles zeros', () => {
    expect(candidateCacheKey({ brightnessOffset: 0, contrastOffset: 0 })).toBe('0:0')
  })
})

describe('getCached / putCached', () => {
  it('returns undefined for missing key', () => {
    const cache: CandidateCache = new Map()
    expect(getCached(cache, { brightnessOffset: 0, contrastOffset: 0 })).toBeUndefined()
  })

  it('returns stored mosaic', () => {
    const cache: CandidateCache = new Map()
    const m = fakeMosaic()
    putCached(cache, { brightnessOffset: 10, contrastOffset: -10 }, m)
    expect(getCached(cache, { brightnessOffset: 10, contrastOffset: -10 })).toBe(m)
  })
})

describe('hydrateGridFromCache', () => {
  it('returns all 9 keys as missing when cache is empty', () => {
    const grid = buildInitialGrid()
    const cache: CandidateCache = new Map()
    const missing = hydrateGridFromCache(grid, cache)
    expect(missing).toHaveLength(9)
  })

  it('hydrates cells found in cache and excludes them from missing', () => {
    const grid = buildInitialGrid()
    const cache: CandidateCache = new Map()
    const centerKey = grid.cells[4].key
    const m = fakeMosaic(1)
    putCached(cache, centerKey, m)

    const missing = hydrateGridFromCache(grid, cache)
    expect(missing).toHaveLength(8)
    expect(grid.cells[4].status).toBe('ready')
    expect(grid.cells[4].mosaic).toBe(m)
  })

  it('full hit: returns empty missing array', () => {
    const grid = buildInitialGrid()
    const cache: CandidateCache = new Map()
    for (let i = 0; i < 9; i++) putCached(cache, grid.cells[i].key, fakeMosaic(i))
    const missing = hydrateGridFromCache(grid, cache)
    expect(missing).toHaveLength(0)
    for (let i = 0; i < 9; i++) expect(grid.cells[i].status).toBe('ready')
  })

  it('skips already-ready cells', () => {
    const grid = buildInitialGrid()
    grid.cells[0] = { ...grid.cells[0], status: 'ready', mosaic: fakeMosaic() }
    const cache: CandidateCache = new Map()
    const missing = hydrateGridFromCache(grid, cache)
    expect(missing).toHaveLength(8)  // cells[0] is ready, not counted as missing
  })
})
