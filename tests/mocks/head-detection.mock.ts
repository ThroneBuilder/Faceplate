import { vi } from 'vitest'

vi.mock('../../src/lib/image/head-detection.js', () => ({
  initHeadDetector: vi.fn().mockResolvedValue(undefined),
  detectHeadBounds: vi.fn().mockReturnValue({
    topY: 40,
    bottomY: 200,
    detectionStatus: 'found' as const,
  }),
}))
