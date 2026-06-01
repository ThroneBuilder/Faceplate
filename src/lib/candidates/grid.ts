import type { CandidateGrid, CandidateKey, MosaicCandidate } from '../../types/index.js'

export const DEFAULT_DISTANCE = 16

function clamp(v: number): number {
  return Math.max(-100, Math.min(100, v))
}

function pending(key: CandidateKey): MosaicCandidate {
  return { key, status: 'pending' }
}

/** Returns 9 keys in row-major order (top-left to bottom-right); index 4 === center. */
export function computeGridKeys(
  center: CandidateKey,
  distance: number,
): [CandidateKey, CandidateKey, CandidateKey,
    CandidateKey, CandidateKey, CandidateKey,
    CandidateKey, CandidateKey, CandidateKey] {
  const offsets = [-distance, 0, distance] as const
  const keys = offsets.flatMap(dc =>
    offsets.map(db => ({
      brightnessOffset: clamp(center.brightnessOffset + db),
      contrastOffset: clamp(center.contrastOffset + dc),
    }))
  )
  return keys as ReturnType<typeof computeGridKeys>
}

export function buildInitialGrid(distance = DEFAULT_DISTANCE): CandidateGrid {
  const center: CandidateKey = { brightnessOffset: 0, contrastOffset: 0 }
  const keys = computeGridKeys(center, distance)
  const cells = keys.map(pending) as CandidateGrid['cells']
  return { center, stepSize: distance, cells, atMinimumStep: false }
}

/** Builds the next grid centered on selectedKey at the given distance. */
export function buildNextGrid(selectedKey: CandidateKey, distance: number): CandidateGrid {
  const keys = computeGridKeys(selectedKey, distance)
  const cells = keys.map(pending) as CandidateGrid['cells']
  return { center: selectedKey, stepSize: distance, cells, atMinimumStep: false }
}

/** Retained for any existing tests; not used in the main candidate algorithm. */
export function computeNextStep(currentStep: number): number {
  return Math.max(1, Math.floor(currentStep / 2))
}
