import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { readSubmissions, appendSubmission } from '../../src/lib/gallery/submissions.js'
import type { SubmissionRecord } from '../../src/lib/gallery/submissions.js'

const TEST_DIR = join(import.meta.dirname ?? __dirname, '__test-gallery-data__')

beforeEach(() => { mkdirSync(TEST_DIR, { recursive: true }) })
afterEach(()  => { if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true }) })

const rec = (slug: string, ts: number): SubmissionRecord => ({
  uuid: `uuid-${ts}`, slug, timestamp: ts, filename: `uuid-${ts}.png`,
})

describe('readSubmissions', () => {
  it('returns [] when manifest does not exist', () => {
    expect(readSubmissions(TEST_DIR, 'hall-of-faces')).toEqual([])
  })

  it('filters by slug', () => {
    appendSubmission(TEST_DIR, rec('hall-of-faces', 1000))
    appendSubmission(TEST_DIR, rec('hall-of-nobles', 2000))
    const result = readSubmissions(TEST_DIR, 'hall-of-faces')
    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('hall-of-faces')
  })

  it('sorts by timestamp ascending', () => {
    appendSubmission(TEST_DIR, rec('hall-of-faces', 3000))
    appendSubmission(TEST_DIR, rec('hall-of-faces', 1000))
    appendSubmission(TEST_DIR, rec('hall-of-faces', 2000))
    const result = readSubmissions(TEST_DIR, 'hall-of-faces')
    expect(result.map(r => r.timestamp)).toEqual([1000, 2000, 3000])
  })
})

describe('appendSubmission', () => {
  it('writes a record that is then readable', () => {
    appendSubmission(TEST_DIR, rec('hall-of-faces', 5000))
    const result = readSubmissions(TEST_DIR, 'hall-of-faces')
    expect(result).toHaveLength(1)
    expect(result[0].uuid).toBe('uuid-5000')
  })

  it('two appends produce two records', () => {
    appendSubmission(TEST_DIR, rec('hall-of-faces', 100))
    appendSubmission(TEST_DIR, rec('hall-of-faces', 200))
    expect(readSubmissions(TEST_DIR, 'hall-of-faces')).toHaveLength(2)
  })
})
