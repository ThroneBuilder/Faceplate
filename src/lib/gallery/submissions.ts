import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'

export interface SubmissionRecord {
  uuid: string
  slug: string
  timestamp: number
  filename: string
}

function manifestPath(dataDir: string): string {
  return join(dataDir, 'submissions.json')
}

function readAll(dataDir: string): SubmissionRecord[] {
  try {
    return JSON.parse(readFileSync(manifestPath(dataDir), 'utf8')) as SubmissionRecord[]
  } catch {
    return []
  }
}

export function readSubmissions(dataDir: string, slug: string): SubmissionRecord[] {
  return readAll(dataDir)
    .filter(r => r.slug === slug)
    .sort((a, b) => a.timestamp - b.timestamp)
}

export function appendSubmission(dataDir: string, record: SubmissionRecord): void {
  const all = readAll(dataDir)
  all.push(record)
  const path = manifestPath(dataDir)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(all, null, 2))
}
