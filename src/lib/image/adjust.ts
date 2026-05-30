import { PipelineError } from '../../types/index.js'

export function applyAdjustments(
  imageData: ImageData,
  brightnessOffset: number,
  contrastOffset: number,
): ImageData {
  if (brightnessOffset < -128 || brightnessOffset > 128) {
    throw new PipelineError('INVALID_ADJUSTMENT_RANGE', 'brightnessOffset must be in [-128, 128]')
  }
  if (contrastOffset < -128 || contrastOffset > 128) {
    throw new PipelineError('INVALID_ADJUSTMENT_RANGE', 'contrastOffset must be in [-128, 128]')
  }

  const { width, height } = imageData
  const src = imageData.data
  const out = new ImageData(width, height)
  const dst = out.data

  // Contrast factor: standard Photoshop-style formula
  const contrastFactor =
    contrastOffset === 0
      ? 1
      : (259 * (contrastOffset + 255)) / (255 * (259 - contrastOffset))

  for (let i = 0; i < src.length; i += 4) {
    dst[i]     = clamp(contrastFactor * (applyBrightness(src[i],     brightnessOffset) - 128) + 128)
    dst[i + 1] = clamp(contrastFactor * (applyBrightness(src[i + 1], brightnessOffset) - 128) + 128)
    dst[i + 2] = clamp(contrastFactor * (applyBrightness(src[i + 2], brightnessOffset) - 128) + 128)
    dst[i + 3] = src[i + 3] // alpha unchanged
  }

  return out
}

function applyBrightness(channel: number, offset: number): number {
  return clamp(channel + offset)
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}
