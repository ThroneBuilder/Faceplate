import type { Mosaic, FaceMask, LegoColor } from '../../types/index.js'

export const CUBBY_W = 1231
export const CUBBY_H = 1457

// Scale: the full Cubby.JPEG image is 78 brick-widths tall.
// A 32-brick mosaic therefore occupies 32/78 ≈ 41% of the image height.
// The face centre sits 1 brick-width below the image vertical centre.
const IMAGE_BRICKS_H  = 78
const CENTER_OFFSET_B = 1   // bricks below vertical centre

// White 16×16 plate — calibration reference only
export const PLATE_X = 423
export const PLATE_Y = 533
export const PLATE_W = 384
export const PLATE_H = 384

export function loadCubbyImage(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload  = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load Cubby image'))
    img.src = '/images/Cubby.JPEG'
  })
}

export function renderCubbyProjection(
  ctx: CanvasRenderingContext2D,
  cubbyImage: HTMLImageElement,
  mosaic: Mosaic,
  mask: FaceMask,
  palette: LegoColor[],
): void {
  const W = mosaic.width
  const H = mosaic.height

  if (ctx.canvas.width !== CUBBY_W || ctx.canvas.height !== CUBBY_H) {
    ctx.canvas.width  = CUBBY_W
    ctx.canvas.height = CUBBY_H
  }

  // 1. Draw Cubby.JPEG background
  ctx.drawImage(cubbyImage, 0, 0, CUBBY_W, CUBBY_H)

  // 2. Scale: 57% of the base 32/78 proportion → 32-brick face ≈ 23% of image height
  const brickPx = Math.round(CUBBY_H / IMAGE_BRICKS_H * 0.57)  // = 11
  const mosW    = W * brickPx
  const mosH    = H * brickPx
  const centerX = Math.round(CUBBY_W / 2)
  const centerY = Math.round(CUBBY_H / 2) + CENTER_OFFSET_B * brickPx
  const offsetX = centerX - Math.floor(mosW / 2)
  const offsetY = centerY - Math.floor(mosH / 2)

  const paletteMap = new Map(palette.map(c => [c.id, c]))

  // 3. Fill visible brick cells
  for (let r = 0; r < H; r++) {
    const row = mask.rows[r]
    for (let c = row.leftCol; c <= row.rightCol; c++) {
      const colorId = mosaic.grid[r][c]
      const color = paletteMap.get(colorId)
      if (!color) continue
      const [rv, g, b] = color.rgb
      ctx.fillStyle = `rgb(${rv},${g},${b})`
      ctx.fillRect(offsetX + c * brickPx, offsetY + r * brickPx, brickPx, brickPx)
    }
  }

  // 4. Shadow gradients at face boundary edges
  const shadowWidth = brickPx * 3

  for (let r = 0; r < H; r++) {
    const row = mask.rows[r]
    if (row.leftCol > row.rightCol) continue  // fully masked row — no shadow
    const cellY = offsetY + r * brickPx

    if (row.leftCol > 0) {
      const edgeX = offsetX + row.leftCol * brickPx
      const grad = ctx.createLinearGradient(edgeX, 0, edgeX - shadowWidth, 0)
      grad.addColorStop(0, 'rgba(0,0,0,0.35)')
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grad
      ctx.fillRect(edgeX - shadowWidth, cellY, shadowWidth, brickPx)
    }

    if (row.rightCol < W - 1) {
      const edgeX = offsetX + (row.rightCol + 1) * brickPx
      const grad = ctx.createLinearGradient(edgeX, 0, edgeX + shadowWidth, 0)
      grad.addColorStop(0, 'rgba(0,0,0,0.35)')
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grad
      ctx.fillRect(edgeX, cellY, shadowWidth, brickPx)
    }
  }
}
