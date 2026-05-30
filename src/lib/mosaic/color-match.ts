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

// ─── Palette matching ─────────────────────────────────────────────────────────

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

  // Snapshot palette RGB into a flat array once — avoids repeated property lookups
  // inside the hot 34,816-iteration loop.
  const cached: CachedPaletteEntry[] = palette.map(c => ({
    id: c.id,
    r: c.rgb[0],
    g: c.rgb[1],
    b: c.rgb[2],
  }))

  return grid.map(row =>
    row.map(([r, g, b]) => {
      let minDist = Infinity
      let bestId = cached[0].id
      for (const { id, r: pr, g: pg, b: pb } of cached) {
        const dist = ciede2000(r, g, b, pr, pg, pb)
        if (dist < minDist) {
          minDist = dist
          bestId = id
        }
      }
      return bestId
    }),
  )
}
