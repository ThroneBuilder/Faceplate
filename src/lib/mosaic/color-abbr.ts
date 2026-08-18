import type { LegoColor } from '../../types/index.js'

// Pinned letters for colors whose auto-derived abbreviation would otherwise
// be decided by fallback collisions with other colors — reserved up front so
// palette edits elsewhere can't silently reshuffle them.
const ABBR_OVERRIDES: Record<string, string> = {
  'Dark Brown': 'DB',
  'Dark Bluish Gray': 'DG',
}

/** Deterministic, unique 2-letter abbreviation per palette color (order-dependent). */
export function buildColorAbbreviations(colors: LegoColor[]): Map<number, string> {
  const used = new Set<string>()
  const result = new Map<number, string>()

  for (const color of colors) {
    const override = ABBR_OVERRIDES[color.name]
    if (override) {
      result.set(color.id, override)
      used.add(override)
    }
  }

  for (const color of colors) {
    if (result.has(color.id)) continue
    const words = color.name.trim().split(/\s+/)
    const candidates: string[] = [
      words.length >= 2 ? (words[0][0] + words[1][0]).toUpperCase() : color.name.slice(0, 2).toUpperCase(),
      color.name.replace(/\s/g, '').slice(0, 2).toUpperCase(),
      (color.name[0] + (color.name.replace(/\s/g, '')[2] ?? color.name[1])).toUpperCase(),
      (color.name[0] + color.name[color.name.length - 1]).toUpperCase(),
      words[words.length - 1].slice(0, 2).toUpperCase(),
    ]
    let abbr = candidates.find(c => c.length === 2 && !used.has(c)) ?? ''
    if (!abbr) {
      const az = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      outer: for (const a of az) for (const b of az) { if (!used.has(a + b)) { abbr = a + b; break outer } }
    }
    used.add(abbr)
    result.set(color.id, abbr)
  }
  return result
}
