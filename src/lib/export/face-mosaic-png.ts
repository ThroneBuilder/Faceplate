import type { Mosaic, FaceMask, LegoColor } from '../../types/index.js'

export function renderFaceMosaicPng(
  mosaic: Mosaic,
  mask: FaceMask,
  palette: LegoColor[],
  brickPx = 10,
): Promise<Blob> {
  const W = mosaic.width
  const H = mosaic.height
  const canvas = document.createElement('canvas')
  canvas.width  = W * brickPx
  canvas.height = H * brickPx
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const paletteMap = new Map(palette.map(c => [c.id, c]))

  for (let r = 0; r < H; r++) {
    const row = mask.rows[r]
    for (let c = row.leftCol; c <= row.rightCol; c++) {
      const color = paletteMap.get(mosaic.grid[r][c])
      if (!color) continue
      const [rv, g, b] = color.rgb
      ctx.fillStyle = `rgb(${rv},${g},${b})`
      ctx.fillRect(c * brickPx, r * brickPx, brickPx, brickPx)
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob)
      else reject(new Error('PNG blob generation failed'))
    }, 'image/png')
  })
}
