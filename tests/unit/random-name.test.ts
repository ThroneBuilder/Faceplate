import { describe, it, expect } from 'vitest'
import { generateRandomName } from '../../src/lib/gallery/random-name.js'

describe('generateRandomName', () => {
  it('returns exactly three words separated by spaces', () => {
    for (let i = 0; i < 30; i++) {
      const name = generateRandomName()
      const words = name.split(' ')
      expect(words).toHaveLength(3)
    }
  })

  it('output matches the expected all-lowercase pattern', () => {
    for (let i = 0; i < 30; i++) {
      const name = generateRandomName()
      expect(name).toMatch(/^[a-z]+ [a-z]+ [a-z]+$/)
    }
  })
})
