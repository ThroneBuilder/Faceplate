import type { Mosaic, FaceMask, LegoColor } from '../../types/index.js'
import { buildColorAbbreviations } from '../mosaic/color-abbr.js'

const GRID_INTERVAL_BRICKS = 4
const YELLOW = '#FFCC00'

function textColorFor([r, g, b]: [number, number, number]): string {
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? '#000000' : '#ffffff'
}

function drawVLine(ctx: CanvasRenderingContext2D, x: number, y0: number, y1: number): void {
  ctx.beginPath()
  ctx.moveTo(x, y0)
  ctx.lineTo(x, y1)
  ctx.stroke()
}

function drawHLine(ctx: CanvasRenderingContext2D, y: number, x0: number, x1: number): void {
  ctx.beginPath()
  ctx.moveTo(x0, y)
  ctx.lineTo(x1, y)
  ctx.stroke()
}

/**
 * Renders a printable assembly reference: the mosaic with each brick's color
 * letter imposed on it, a positioning grid (thick yellow center cross, thinner
 * yellow lines every 4 bricks out from center), and a letter → color → count
 * legend alongside it.
 */
export function renderAssemblyGuidePng(
  mosaic: Mosaic,
  mask: FaceMask,
  palette: LegoColor[],
  brickPx = 28,
): Promise<Blob> {
  const W = mosaic.width
  const H = mosaic.height
  const paletteMap = new Map(palette.map(c => [c.id, c]))
  const abbr = buildColorAbbreviations(palette)

  // Brick counts within the visible (masked) area — matches bricklink-wanted.xml.
  const counts = new Map<number, number>()
  for (let r = 0; r < H; r++) {
    const row = mask.rows[r]
    for (let c = row.leftCol; c <= row.rightCol; c++) {
      const colorId = mosaic.grid[r][c]
      counts.set(colorId, (counts.get(colorId) ?? 0) + 1)
    }
  }
  const legendRows = [...counts.entries()]
    .map(([colorId, count]) => ({
      color: paletteMap.get(colorId)!,
      letter: abbr.get(colorId) ?? '??',
      count,
    }))
    .filter(row => row.color)
    .sort((a, b) => a.letter.localeCompare(b.letter))
  const totalPieces = legendRows.reduce((s, row) => s + row.count, 0)

  const gridW = W * brickPx
  const gridH = H * brickPx

  const legendW = 260
  const legendPadding = 16
  const legendHeaderH = 44
  const legendRowH = Math.max(brickPx, 26)
  const legendFooterH = 32
  const legendH = legendHeaderH + legendRows.length * legendRowH + legendFooterH + legendPadding * 2

  const canvas = document.createElement('canvas')
  canvas.width = gridW + legendW
  canvas.height = Math.max(gridH, legendH)
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // ── Mosaic cells with color-letter labels ──
  const letterFontPx = Math.max(9, Math.floor(brickPx * 0.4))
  for (let r = 0; r < H; r++) {
    const row = mask.rows[r]
    for (let c = row.leftCol; c <= row.rightCol; c++) {
      const colorId = mosaic.grid[r][c]
      const color = paletteMap.get(colorId)
      if (!color) continue
      const x = c * brickPx
      const y = r * brickPx
      const [rv, g, b] = color.rgb
      ctx.fillStyle = `rgb(${rv},${g},${b})`
      ctx.fillRect(x, y, brickPx, brickPx)
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'
      ctx.lineWidth = 1
      ctx.strokeRect(x + 0.5, y + 0.5, brickPx - 1, brickPx - 1)

      ctx.fillStyle = textColorFor(color.rgb)
      ctx.font = `bold ${letterFontPx}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(abbr.get(colorId) ?? '??', x + brickPx / 2, y + brickPx / 2 + 1)
    }
  }

  // ── Positioning grid: thin lines every 4 bricks, thick lines through center ──
  const centerX = (W / 2) * brickPx
  const centerY = (H / 2) * brickPx
  const thickWidth = Math.max(3, Math.round(brickPx * 0.12))
  const thinWidth  = Math.max(1, Math.round(brickPx * 0.04))
  const maxOffsetBricks = Math.ceil(Math.max(W, H) / 2)

  ctx.strokeStyle = YELLOW
  ctx.globalAlpha = 0.5
  ctx.lineWidth = thinWidth
  for (let offset = GRID_INTERVAL_BRICKS; offset <= maxOffsetBricks; offset += GRID_INTERVAL_BRICKS) {
    const xLeft  = centerX - offset * brickPx
    const xRight = centerX + offset * brickPx
    if (xLeft > 0)      drawVLine(ctx, xLeft, 0, gridH)
    if (xRight < gridW)  drawVLine(ctx, xRight, 0, gridH)

    const yTop    = centerY - offset * brickPx
    const yBottom = centerY + offset * brickPx
    if (yTop > 0)        drawHLine(ctx, yTop, 0, gridW)
    if (yBottom < gridH)  drawHLine(ctx, yBottom, 0, gridW)
  }
  ctx.globalAlpha = 1

  ctx.strokeStyle = YELLOW
  ctx.lineWidth = thickWidth
  drawVLine(ctx, centerX, 0, gridH)
  drawHLine(ctx, centerY, 0, gridW)

  // ── Legend ──
  ctx.fillStyle = '#111111'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font = 'bold 16px system-ui, sans-serif'
  ctx.fillText('Color Legend', gridW + legendPadding, legendPadding + 18)

  let ly = legendPadding + legendHeaderH
  const swatchSize = Math.min(legendRowH - 8, 24)
  for (const row of legendRows) {
    const swatchX = gridW + legendPadding
    const swatchY = ly + (legendRowH - swatchSize) / 2
    const [rv, g, b] = row.color.rgb

    ctx.fillStyle = `rgb(${rv},${g},${b})`
    ctx.fillRect(swatchX, swatchY, swatchSize, swatchSize)
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'
    ctx.lineWidth = 1
    ctx.strokeRect(swatchX + 0.5, swatchY + 0.5, swatchSize - 1, swatchSize - 1)

    ctx.fillStyle = textColorFor(row.color.rgb)
    ctx.font = `bold ${Math.floor(swatchSize * 0.48)}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(row.letter, swatchX + swatchSize / 2, swatchY + swatchSize / 2 + 1)

    ctx.textAlign = 'left'
    ctx.fillStyle = '#111111'
    ctx.font = '13px system-ui, sans-serif'
    ctx.fillText(row.color.name, swatchX + swatchSize + 10, ly + legendRowH / 2 - 6)
    ctx.fillStyle = '#666666'
    ctx.font = '12px system-ui, sans-serif'
    ctx.fillText(`× ${row.count}`, swatchX + swatchSize + 10, ly + legendRowH / 2 + 10)

    ly += legendRowH
  }

  ctx.fillStyle = '#111111'
  ctx.font = 'bold 13px system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(`Total: ${totalPieces} bricks`, gridW + legendPadding, ly + legendFooterH / 2 + 12)

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob)
      else reject(new Error('PNG blob generation failed'))
    }, 'image/png')
  })
}
