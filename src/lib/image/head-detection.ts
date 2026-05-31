import type { HeadBounds } from '../../types/index.js'

// MediaPipe FaceLandmarker imports — ESM, browser-only.
// In tests, this module is mocked via tests/mocks/head-detection.mock.ts.
// @ts-ignore — types may vary across @mediapipe/tasks-vision versions
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

// WASM runtime loaded from CDN (not user data; computation stays client-side).
// Model file is bundled locally at /models/face_landmarker.task.
const WASM_PATH  = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
const MODEL_PATH = '/models/face_landmarker.task'
const MIN_DETECTION_HEIGHT_PX = 150

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let detector: any = null
let detectorUnavailable = false
let initPromise: Promise<void> | null = null

export async function initHeadDetector(): Promise<void> {
  if (detector || detectorUnavailable) return
  if (initPromise) return initPromise

  initPromise = (async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(WASM_PATH)
      detector = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_PATH,
          delegate: 'CPU', // CPU for bit-exact determinism (FR-020)
        },
        runningMode: 'IMAGE',
        numFaces: 1,
      })
    } catch (err) {
      console.warn('[head-detection] Model unavailable, falling back to full-image bounds:', err)
      detectorUnavailable = true
    }
  })()

  return initPromise
}

export function detectHeadBounds(imageData: ImageData): HeadBounds {
  const fullImage: HeadBounds = {
    topY: 0,
    bottomY: imageData.height,
    detectionStatus: 'not-found',
  }

  if (detectorUnavailable || !detector) return fullImage

  try {
    const result = detector.detect(imageData)

    if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
      return fullImage
    }

    const lm = result.faceLandmarks[0]
    const lm10  = lm[10]   // mid-forehead
    const lm152 = lm[152]  // chin tip
    const lm234 = lm[234]  // left cheek edge
    const lm454 = lm[454]  // right cheek edge

    if (!lm10 || !lm152) return fullImage

    const faceHeightNorm = lm152.y - lm10.y
    const topYNorm    = lm10.y - 0.10 * faceHeightNorm
    const bottomYNorm = lm152.y

    const topY    = Math.round(topYNorm    * imageData.height)
    const bottomY = Math.round(bottomYNorm * imageData.height)

    if (bottomY - topY < MIN_DETECTION_HEIGHT_PX) {
      return { topY: 0, bottomY: imageData.height, detectionStatus: 'too-small' }
    }

    // Horizontal face bounds with 10% padding on each side
    const HPAD = 0.08
    const leftX  = lm234
      ? Math.max(0, Math.round((lm234.x - HPAD) * imageData.width))
      : undefined
    const rightX = lm454
      ? Math.min(imageData.width, Math.round((lm454.x + HPAD) * imageData.width))
      : undefined

    return {
      topY:    Math.max(0, topY),
      bottomY: Math.min(imageData.height, bottomY),
      leftX,
      rightX,
      detectionStatus: 'found',
    }
  } catch (err) {
    console.warn('[head-detection] Inference error, using full-image bounds:', err)
    return fullImage
  }
}
