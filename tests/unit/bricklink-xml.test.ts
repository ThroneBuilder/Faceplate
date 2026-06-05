import { describe, it, expect } from 'vitest'
import { generateBrickLinkXml } from '../../src/lib/export/bricklink-xml.js'
import type { Mosaic, FaceMask, LegoColor } from '../../src/types/index.js'

const palette: LegoColor[] = [
  { id: 1, name: 'White', rgb: [255,255,255], brickLinkColorId: 1 },
  { id: 2, name: 'Black', rgb: [0,0,0],       brickLinkColorId: 11 },
  { id: 3, name: 'Red',   rgb: [255,0,0]       },  // no brickLinkColorId
]

const fullMask: FaceMask = {
  rows: [
    { leftCol: 0, rightCol: 1 },
    { leftCol: 0, rightCol: 1 },
  ],
  mosaicWidth: 2,
}

const mosaic2x2: Mosaic = {
  grid: [[1, 2], [1, 2]],
  width: 32, height: 2 as any,
  algorithmVersion: '1.0.0', pieceType: '1x1-plate', mask: null,
}

describe('generateBrickLinkXml', () => {
  it('single colour produces one <ITEM>', () => {
    const singleMosaic: Mosaic = { ...mosaic2x2, grid: [[1, 1], [1, 1]] }
    const { xml, omittedColours } = generateBrickLinkXml(singleMosaic, fullMask, palette)
    expect(xml).toContain('<COLOR>1</COLOR>')
    expect(xml).toContain('<MINQTY>4</MINQTY>')
    expect(omittedColours).toHaveLength(0)
    const itemCount = (xml.match(/<ITEM>/g) ?? []).length
    expect(itemCount).toBe(1)
  })

  it('multiple colours produce one <ITEM> per colour with correct counts', () => {
    const { xml } = generateBrickLinkXml(mosaic2x2, fullMask, palette)
    expect(xml).toContain('<COLOR>1</COLOR>')
    expect(xml).toContain('<COLOR>11</COLOR>')
    const minqtyMatches = xml.match(/<MINQTY>(\d+)<\/MINQTY>/g) ?? []
    // Both colours appear 2 times in a 2×2 grid
    expect(minqtyMatches).toHaveLength(2)
    for (const m of minqtyMatches) expect(m).toContain('2')
  })

  it('masked cells are excluded from counts', () => {
    const leftOnlyMask: FaceMask = {
      rows: [{ leftCol: 0, rightCol: 0 }, { leftCol: 0, rightCol: 0 }],
      mosaicWidth: 2,
    }
    const { xml } = generateBrickLinkXml(mosaic2x2, leftOnlyMask, palette)
    // Only col 0 visible → only color 1 (White)
    expect(xml).toContain('<COLOR>1</COLOR>')
    expect(xml).not.toContain('<COLOR>11</COLOR>')
  })

  it('colour without brickLinkColorId is omitted and listed', () => {
    const redMosaic: Mosaic = { ...mosaic2x2, grid: [[3, 3], [3, 3]] }
    const { xml, omittedColours } = generateBrickLinkXml(redMosaic, fullMask, palette)
    expect(xml).not.toContain('<ITEM>')
    expect(omittedColours).toContain('Red')
  })

  it('produces valid XML structure', () => {
    const { xml } = generateBrickLinkXml(mosaic2x2, fullMask, palette)
    expect(xml).toContain('<?xml version="1.0"')
    expect(xml).toContain('<INVENTORY>')
    expect(xml).toContain('</INVENTORY>')
    expect(xml).toContain('<ITEMID>3024</ITEMID>')
  })
})
