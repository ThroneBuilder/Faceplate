import type { FaceMask, FaceMaskRow } from '../../types/index.js'

// Head profile: wide and square across the top (forehead/temples), tapers toward chin.
// t=0 is top of mosaic, t=1 is bottom.
function headHalfWidth(t: number, W: number): number {
  const maxHalf = W * 0.46
  if (t < 0.20) {
    // Crown: nearly full width, just round the top corners slightly
    return maxHalf * (1 - 0.18 * ((0.20 - t) / 0.20) ** 2)
  }
  if (t < 0.55) {
    // Forehead → cheeks: hold at maximum width
    return maxHalf
  }
  // Jaw → chin: taper linearly to ~45% of max width
  const p = (t - 0.55) / 0.45
  return maxHalf * (1 - p * 0.55)
}

export function buildInitialMask(mosaicWidth: number, mosaicHeight: number): FaceMask {
  const cx = mosaicWidth / 2
  const rows: FaceMaskRow[] = []

  for (let r = 0; r < mosaicHeight; r++) {
    const t = (r + 0.5) / mosaicHeight
    const hw = Math.max(0, headHalfWidth(t, mosaicWidth))
    rows.push({
      leftCol:  Math.max(0,               Math.floor(cx - hw)),
      rightCol: Math.min(mosaicWidth - 1, Math.ceil(cx + hw)),
    })
  }

  return { rows, mosaicWidth }
}

export function toggleMaskCell(mask: FaceMask, row: number, col: number): FaceMask {
  const W = mask.mosaicWidth
  const distLeft  = col + 1
  const distRight = W - col
  const rows = mask.rows.slice() as FaceMaskRow[]
  const current = rows[row]

  if (distLeft <= distRight) {
    // Left edge
    const isMasked = col < current.leftCol
    rows[row] = { ...current, leftCol: isMasked ? col : col + 1 }
  } else {
    // Right edge
    const isMasked = col > current.rightCol
    rows[row] = { ...current, rightCol: isMasked ? col : col - 1 }
  }

  return { ...mask, rows }
}

export function isCellVisible(mask: FaceMask, row: number, col: number): boolean {
  const r = mask.rows[row]
  return col >= r.leftCol && col <= r.rightCol
}
