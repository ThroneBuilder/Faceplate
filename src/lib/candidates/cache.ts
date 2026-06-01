import type { CandidateCache, CandidateGrid, CandidateKey, Mosaic } from '../../types/index.js'

export function candidateCacheKey(key: CandidateKey): string {
  return `${key.brightnessOffset}:${key.contrastOffset}`
}

export function getCached(cache: CandidateCache, key: CandidateKey): Mosaic | undefined {
  return cache.get(candidateCacheKey(key))
}

export function putCached(cache: CandidateCache, key: CandidateKey, mosaic: Mosaic): void {
  cache.set(candidateCacheKey(key), mosaic)
}

/** Fills in-place any pending cells found in cache. Returns keys still needing generation. */
export function hydrateGridFromCache(
  grid: CandidateGrid,
  cache: CandidateCache,
): CandidateKey[] {
  const missing: CandidateKey[] = []
  for (let i = 0; i < 9; i++) {
    const cell = grid.cells[i]
    if (cell.status !== 'pending') continue
    const cached = getCached(cache, cell.key)
    if (cached) {
      grid.cells[i] = { ...cell, status: 'ready', mosaic: cached }
    } else {
      missing.push(cell.key)
    }
  }
  return missing
}
