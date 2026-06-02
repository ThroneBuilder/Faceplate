import type { Mosaic, FaceMask, LegoColor } from '../../types/index.js'

// Calibrated against Cubby.JPEG at 1231×1457 px — verify with debug overlay during implementation
export const PLATE_X = 475   // left edge of white plate
export const PLATE_Y = 590   // top edge of white plate
export const PLATE_W = 280   // plate width in px (16 studs × ~17.5 px/stud)
export const PLATE_H = 280   // plate height in px (square plate)
export const CUBBY_W = 1231
export const CUBBY_H = 1457
// The 16×16 plate is 16 LEGO studs wide/tall; a 32-brick mosaic is 2× plate height physically
const PLATE_STUDS = 16

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

  // Set canvas to native image resolution for sharpness
  if (ctx.canvas.width !== CUBBY_W || ctx.canvas.height !== CUBBY_H) {
    ctx.canvas.width  = CUBBY_W
    ctx.canvas.height = CUBBY_H
  }

  // 1. Draw Cubby.JPEG background
  ctx.drawImage(cubbyImage, 0, 0, CUBBY_W, CUBBY_H)

  // 2. Compute brick pixel size: 1 brick = 1 LEGO stud = 1/16 of plate dimension
  //    A 32-brick mosaic is physically 2× the 16-stud plate height
  const brickW = Math.floor(Math.min(PLATE_W, PLATE_H) / PLATE_STUDS)
  const brickH = brickW  // square bricks
  const offsetX = PLATE_X + Math.floor((PLATE_W - brickW * W) / 2)
  const offsetY = PLATE_Y + Math.floor((PLATE_H - brickH * H) / 2)

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
      ctx.fillRect(offsetX + c * brickW, offsetY + r * brickH, brickW, brickH)
    }
  }

  // 4. Shadow gradients at left/right face boundary edges
  const shadowWidth = brickW * 3

  for (let r = 0; r < H; r++) {
    const row = mask.rows[r]
    const cellY = offsetY + r * brickH

    // Left shadow: face edge casts shadow toward left masked area
    if (row.leftCol > 0 && row.leftCol <= row.rightCol) {
      const edgeX = offsetX + row.leftCol * brickW
      const grad = ctx.createLinearGradient(edgeX, 0, edgeX - shadowWidth, 0)
      grad.addColorStop(0,   'rgba(0,0,0,0.35)')
      grad.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = grad
      ctx.fillRect(edgeX - shadowWidth, cellY, shadowWidth, brickH)
    }

    // Right shadow: face edge casts shadow toward right masked area
    if (row.rightCol < W - 1 && row.leftCol <= row.rightCol) {
      const edgeX = offsetX + (row.rightCol + 1) * brickW
      const grad = ctx.createLinearGradient(edgeX, 0, edgeX + shadowWidth, 0)
      grad.addColorStop(0,   'rgba(0,0,0,0.35)')
      grad.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = grad
      ctx.fillRect(edgeX, cellY, shadowWidth, brickH)
    }
  }
}
