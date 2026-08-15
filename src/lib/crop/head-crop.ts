import type { CropGeometry, BrickHeight } from '../../types/index.js'

export function computeCropGeometry(
  topY: number,
  bottomY: number,
  imageWidth: number,
  brickHeight: BrickHeight,
): CropGeometry {
  const cropHeightPx = bottomY - topY
  const cropWidthPx  = Math.round(cropHeightPx * 32 / brickHeight)
  const leftX        = Math.round((imageWidth - cropWidthPx) / 2)
  const rightX       = leftX + cropWidthPx
  return { topY, bottomY, leftX, rightX, cropWidthPx, cropHeightPx }
}

export function clampHandles(
  topY: number,
  bottomY: number,
  imageHeight: number,
  minHeightPx = 100,
): { topY: number; bottomY: number } {
  const t = Math.max(0, Math.min(Math.round(topY), imageHeight - minHeightPx))
  const b = Math.max(t + minHeightPx, Math.min(Math.round(bottomY), imageHeight))
  return { topY: t, bottomY: b }
}

/**
 * Given a fixed brick height (bricks span the full cropHeightPx) and a freely
 * chosen crop width, picks the number of bricks wide that will hold the crop
 * without shrinking it, then widens the crop symmetrically (≤ half a brick
 * per side) so its pixel width divides evenly into whole bricks — avoiding
 * the sub-pixel stretch that would otherwise distort the image when it's
 * downsampled onto the brick grid.
 */
export function widenCropToBrickWidth(
  leftX: number,
  rightX: number,
  cropHeightPx: number,
  imageWidth: number,
  brickHeight: BrickHeight,
): { leftX: number; rightX: number; cropWidthPx: number; brickWidth: number } {
  const cropWidthPx = rightX - leftX
  const pxPerBrick = cropHeightPx / brickHeight
  const brickWidth = Math.max(1, Math.ceil(cropWidthPx / pxPerBrick))
  const targetWidthPx = brickWidth * pxPerBrick
  const extraEach = (targetWidthPx - cropWidthPx) / 2

  let newLeft = leftX - extraEach
  let newRight = rightX + extraEach

  // Clamp to image bounds, giving any unusable margin back to the other side.
  if (newLeft < 0) {
    newRight = Math.min(imageWidth, newRight - newLeft)
    newLeft = 0
  }
  if (newRight > imageWidth) {
    newLeft = Math.max(0, newLeft - (newRight - imageWidth))
    newRight = imageWidth
  }

  newLeft = Math.round(newLeft)
  newRight = Math.round(newRight)

  return { leftX: newLeft, rightX: newRight, cropWidthPx: newRight - newLeft, brickWidth }
}

export function scaleToBrickHeight(
  topY: number,
  bottomY: number,
  imageHeight: number,
  fromHeight: BrickHeight,
  toHeight: BrickHeight,
): { topY: number; bottomY: number } {
  if (fromHeight === toHeight) return { topY, bottomY }
  const currentH = bottomY - topY
  const newH     = Math.round(currentH * toHeight / fromHeight)
  const center   = (topY + bottomY) / 2
  const newTop   = Math.round(center - newH / 2)
  const newBot   = newTop + newH
  return clampHandles(newTop, newBot, imageHeight)
}
