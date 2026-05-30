import type { Mosaic, LegoColor, PartsList } from '../../types/index.js'

export function derivePartsList(mosaic: Mosaic, palette: LegoColor[]): PartsList {
  const paletteMap = new Map(palette.map(c => [c.id, c]))
  const counts = new Map<number, number>()

  for (const row of mosaic.grid) {
    for (const colorId of row) {
      counts.set(colorId, (counts.get(colorId) ?? 0) + 1)
    }
  }

  const entries = [...counts.entries()]
    .map(([colorId, count]) => {
      const color = paletteMap.get(colorId)!
      const [r, g, b] = color.rgb
      return {
        colorId,
        colorName: color.name,
        count,
        rgbHex: `#${toHex(r)}${toHex(g)}${toHex(b)}`,
        brickLinkColorId: color.brickLinkColorId,
        studioColorId: color.studioColorId,
      }
    })
    .sort((a, b) => b.count - a.count)

  const totalPieces = entries.reduce((s, e) => s + e.count, 0)

  return { entries, totalPieces }
}

function toHex(n: number): string {
  return n.toString(16).padStart(2, '0')
}
