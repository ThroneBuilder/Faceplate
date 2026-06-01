import type { CandidateGrid, CandidateKey, MosaicCandidate } from '../../types/index.js'

const INITIAL_STEP = 67  // Math.round(100 * 2 / 3)

function clamp(v: number): number {
  return Math.max(-100, Math.min(100, v))
}

function pending(key: CandidateKey): MosaicCandidate {
  return { key, status: 'pending' }
}

export function computeNextStep(currentStep: number): number {
  return Math.max(1, Math.floor(currentStep / 2))
}

/** Returns 9 keys in row-major order (top-left to bottom-right); index 4 === center. */
export function computeGridKeys(
  center: CandidateKey,
  stepSize: number,
): [CandidateKey, CandidateKey, CandidateKey,
    CandidateKey, CandidateKey, CandidateKey,
    CandidateKey, CandidateKey, CandidateKey] {
  const offsets = [-stepSize, 0, stepSize] as const
  const keys = offsets.flatMap(dc =>
    offsets.map(db => ({
      brightnessOffset: clamp(center.brightnessOffset + db),
      contrastOffset: clamp(center.contrastOffset + dc),
    }))
  )
  // Row-major: rows go top→bottom (contrast axis), columns left→right (brightness axis)
  return keys as ReturnType<typeof computeGridKeys>
}

export function buildInitialGrid(): CandidateGrid {
  const center: CandidateKey = { brightnessOffset: 0, contrastOffset: 0 }
  const keys = computeGridKeys(center, INITIAL_STEP)
  const cells = keys.map(pending) as CandidateGrid['cells']
  return { center, stepSize: INITIAL_STEP, cells, atMinimumStep: false }
}

export function buildNextGrid(selectedKey: CandidateKey, currentStep: number): CandidateGrid {
  const nextStep = computeNextStep(currentStep)
  const keys = computeGridKeys(selectedKey, nextStep)
  const cells = keys.map(pending) as CandidateGrid['cells']
  return { center: selectedKey, stepSize: nextStep, cells, atMinimumStep: nextStep === 1 }
}
