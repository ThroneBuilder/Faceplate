import { describe, it, expect } from 'vitest'
import { buildColorAbbreviations } from '../../src/lib/mosaic/color-abbr.js'
import type { LegoColor } from '../../src/types/index.js'
import PALETTE from '../../src/data/lego-palette.json'

const palette = PALETTE as LegoColor[]

describe('buildColorAbbreviations', () => {
  it('produces exactly one abbreviation per color', () => {
    const abbr = buildColorAbbreviations(palette)
    expect(abbr.size).toBe(palette.length)
  })

  it('abbreviations are unique across the palette', () => {
    const abbr = buildColorAbbreviations(palette)
    const values = [...abbr.values()]
    expect(new Set(values).size).toBe(values.length)
  })

  it('pins Dark Brown to DB regardless of palette order', () => {
    const darkBrown = palette.find(c => c.name === 'Dark Brown')!
    const abbr = buildColorAbbreviations(palette)
    expect(abbr.get(darkBrown.id)).toBe('DB')
  })

  it('pins Dark Bluish Gray to DG regardless of palette order', () => {
    const darkBluishGray = palette.find(c => c.name === 'Dark Bluish Gray')!
    const abbr = buildColorAbbreviations(palette)
    expect(abbr.get(darkBluishGray.id)).toBe('DG')
  })

  it('pinned overrides still hold when the palette order is reversed', () => {
    const darkBrown = palette.find(c => c.name === 'Dark Brown')!
    const darkBluishGray = palette.find(c => c.name === 'Dark Bluish Gray')!
    const abbr = buildColorAbbreviations([...palette].reverse())
    expect(abbr.get(darkBrown.id)).toBe('DB')
    expect(abbr.get(darkBluishGray.id)).toBe('DG')
  })
})
