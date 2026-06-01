import type { WorkerInput, WorkerOutput } from '../../types/index.js'
import { applyAdjustments } from '../image/adjust.js'
import { generateMosaic } from '../mosaic/pipeline.js'

self.onmessage = (event: MessageEvent<WorkerInput>) => {
  const { index, imageBuffer, imageWidth, imageHeight, brightnessOffset, contrastOffset, palette, height } = event.data
  const t0 = performance.now()
  try {
    const raw = new ImageData(new Uint8ClampedArray(imageBuffer), imageWidth, imageHeight)
    const adjusted = applyAdjustments(raw, brightnessOffset, contrastOffset)
    const mosaic = generateMosaic(adjusted, palette, { height })
    const durationMs = performance.now() - t0
    const output: WorkerOutput = { index, mosaic, durationMs }
    self.postMessage(output)
  } catch (err: unknown) {
    const output: WorkerOutput = { index, error: err instanceof Error ? err.message : String(err) }
    self.postMessage(output)
  }
}
