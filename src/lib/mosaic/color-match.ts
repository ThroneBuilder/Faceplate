import type { RgbGrid, LegoColor } from '../../types/index.js'
import { PipelineError } from '../../types/index.js'

// ─── sRGB → CIELAB conversion ─────────────────────────────────────────────────

const DEG = Math.PI / 180

function linearize(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function labF(t: number): number {
  const d = 6 / 29
  return t > d ** 3 ? t ** (1 / 3) : t / (3 * d * d) + 4 / 29
}

function rgbToLab(r255: number, g255: number, b255: number): [number, number, number] {
  const r = linearize(r255 / 255)
  const g = linearize(g255 / 255)
  const b = linearize(b255 / 255)
  // Linear RGB → XYZ (D65 illuminant) → Lab
  const x = labF((r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047)
  const y = labF((r * 0.2126729 + g * 0.7151522 + b * 0.0721750) / 1.00000)
  const z = labF((r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883)
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
}

// ─── CIEDE2000 (IEC 61966-2-1) ────────────────────────────────────────────────

function ciede2000(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number,
): number {
  const [L1, a1, b1ab] = rgbToLab(r1, g1, b1)
  const [L2, a2, b2ab] = rgbToLab(r2, g2, b2)

  const C1 = Math.hypot(a1, b1ab)
  const C2 = Math.hypot(a2, b2ab)
  const Cb = (C1 + C2) / 2
  const Cb7 = Cb ** 7
  const G = 0.5 * (1 - Math.sqrt(Cb7 / (Cb7 + 25 ** 7)))
  const a1p = a1 * (1 + G)
  const a2p = a2 * (1 + G)
  const C1p = Math.hypot(a1p, b1ab)
  const C2p = Math.hypot(a2p, b2ab)
  const h1p = (Math.atan2(b1ab, a1p) / DEG + 360) % 360
  const h2p = (Math.atan2(b2ab, a2p) / DEG + 360) % 360

  const dLp = L2 - L1
  const dCp = C2p - C1p
  const both = C1p * C2p
  const hd = h2p - h1p
  const dhp = both === 0 ? 0 : Math.abs(hd) <= 180 ? hd : hd > 180 ? hd - 360 : hd + 360
  const dHp = 2 * Math.sqrt(both) * Math.sin((dhp / 2) * DEG)

  const Lavg = (L1 + L2) / 2
  const Cavg = (C1p + C2p) / 2
  const hs = h1p + h2p
  const havg =
    both === 0 ? hs
    : Math.abs(h1p - h2p) <= 180 ? hs / 2
    : hs < 360 ? (hs + 360) / 2
    : (hs - 360) / 2

  const T =
    1
    - 0.17 * Math.cos((havg - 30) * DEG)
    + 0.24 * Math.cos(2 * havg * DEG)
    + 0.32 * Math.cos((3 * havg + 6) * DEG)
    - 0.20 * Math.cos((4 * havg - 63) * DEG)

  const Cavg7 = Cavg ** 7
  const RC = 2 * Math.sqrt(Cavg7 / (Cavg7 + 25 ** 7))
  const RT = -Math.sin(2 * 30 * Math.exp(-(((havg - 275) / 25) ** 2)) * DEG) * RC
  const SL = 1 + 0.015 * (Lavg - 50) ** 2 / Math.sqrt(20 + (Lavg - 50) ** 2)
  const SC = 1 + 0.045 * Cavg
  const SH = 1 + 0.015 * Cavg * T

  return Math.sqrt(
    (dLp / SL) ** 2 +
    (dCp / SC) ** 2 +
    (dHp / SH) ** 2 +
    RT * (dCp / SC) * (dHp / SH),
  )
}

// ─── Palette matching with Floyd-Steinberg error diffusion ────────────────────
// Set to 1.0 to enable dithering, 0.0 to disable (nearest-neighbour only).
const DITHER_STRENGTH = 0.1

interface CachedPaletteEntry {
  id: number
  r: number
  g: number
  b: number
}

export function matchColors(grid: RgbGrid, palette: LegoColor[]): number[][] {
  if (palette.length === 0) {
    throw new PipelineError('EMPTY_PALETTE', 'Palette must contain at least one color')
  }

  const cached: CachedPaletteEntry[] = palette.map(c => ({
    id: c.id,
    r: c.rgb[0],
    g: c.rgb[1],
    b: c.rgb[2],
  }))

  const rows = grid.length
  const cols = rows > 0 ? grid[0].length : 0

  // Flat error buffer — one float per channel per pixel.
  // Floyd-Steinberg distributes quantization error to right and below-row
  // neighbours in raster order, so we can discard each row once processed.
  const er = new Float32Array(rows * cols)
  const eg = new Float32Array(rows * cols)
  const eb = new Float32Array(rows * cols)

  const result: number[][] = Array.from({ length: rows }, () => new Array<number>(cols))

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c
      const [pr, pg, pb] = grid[r][c]

      // Add accumulated error, clamp to valid RGB range
      const ar = Math.max(0, Math.min(255, pr + er[idx]))
      const ag = Math.max(0, Math.min(255, pg + eg[idx]))
      const ab = Math.max(0, Math.min(255, pb + eb[idx]))

      // Nearest palette colour (CIEDE2000)
      let minDist = Infinity
      let bestId = cached[0].id
      let bestR = cached[0].r
      let bestG = cached[0].g
      let bestB = cached[0].b

      for (const entry of cached) {
        const dist = ciede2000(ar, ag, ab, entry.r, entry.g, entry.b)
        if (dist < minDist) {
          minDist = dist
          bestId = entry.id
          bestR = entry.r
          bestG = entry.g
          bestB = entry.b
        }
      }

      result[r][c] = bestId

      // Quantization error in RGB space (scaled by DITHER_STRENGTH)
      const qer = (ar - bestR) * DITHER_STRENGTH
      const qeg = (ag - bestG) * DITHER_STRENGTH
      const qeb = (ab - bestB) * DITHER_STRENGTH

      // Floyd-Steinberg kernel:  . * 7   (7/16 right)
      //                         3 5 1   (3/16 below-left, 5/16 below, 1/16 below-right)
      if (c + 1 < cols) {
        const i = idx + 1
        er[i] += qer * 0.4375
        eg[i] += qeg * 0.4375
        eb[i] += qeb * 0.4375
      }
      if (r + 1 < rows) {
        const base = (r + 1) * cols
        if (c > 0) {
          er[base + c - 1] += qer * 0.1875
          eg[base + c - 1] += qeg * 0.1875
          eb[base + c - 1] += qeb * 0.1875
        }
        er[base + c] += qer * 0.3125
        eg[base + c] += qeg * 0.3125
        eb[base + c] += qeb * 0.3125
        if (c + 1 < cols) {
          er[base + c + 1] += qer * 0.0625
          eg[base + c + 1] += qeg * 0.0625
          eb[base + c + 1] += qeb * 0.0625
        }
      }
    }
  }

  return result
}
