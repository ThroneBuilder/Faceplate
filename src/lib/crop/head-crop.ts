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
