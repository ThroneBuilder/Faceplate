import type { Mosaic, FaceMask, LegoColor } from '../../types/index.js'

export function generateBrickLinkXml(
  mosaic: Mosaic,
  mask: FaceMask,
  palette: LegoColor[],
): { xml: string; omittedColours: string[] } {
  const paletteMap = new Map(palette.map(c => [c.id, c]))
  const counts = new Map<number, number>()

  for (let r = 0; r < mosaic.height; r++) {
    const row = mask.rows[r]
    for (let c = row.leftCol; c <= row.rightCol; c++) {
      const colorId = mosaic.grid[r][c]
      counts.set(colorId, (counts.get(colorId) ?? 0) + 1)
    }
  }

  const items: string[] = []
  const omittedColours: string[] = []

  for (const [colorId, qty] of counts) {
    const color = paletteMap.get(colorId)
    if (!color?.brickLinkColorId) {
      omittedColours.push(color?.name ?? String(colorId))
      continue
    }
    items.push(
      `  <ITEM>\n` +
      `    <ITEMTYPE>P</ITEMTYPE>\n` +
      `    <ITEMID>3024</ITEMID>\n` +
      `    <COLOR>${color.brickLinkColorId}</COLOR>\n` +
      `    <MINQTY>${qty}</MINQTY>\n` +
      `    <CONDITION>N</CONDITION>\n` +
      `  </ITEM>`
    )
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<INVENTORY>\n${items.join('\n')}\n</INVENTORY>`
  return { xml, omittedColours }
}
