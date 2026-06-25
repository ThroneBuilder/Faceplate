import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'

export interface SubmissionRecord {
  uuid: string
  slug: string
  timestamp: number
  filename: string
  name: string
}

const BATCH_SIZE = 6

function manifestPath(dataDir: string): string {
  return join(dataDir, 'submissions.json')
}

function readAll(dataDir: string): SubmissionRecord[] {
  try {
    const raw = JSON.parse(readFileSync(manifestPath(dataDir), 'utf8')) as Omit<SubmissionRecord, 'name'>[]
    return raw.map(r => ({ name: '', ...r }))
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

export function deleteSubmission(dataDir: string, uuid: string, slug: string): void {
  const all = readAll(dataDir)
  const filtered = all.filter(r => !(r.uuid === uuid && r.slug === slug))
  writeFileSync(manifestPath(dataDir), JSON.stringify(filtered, null, 2))
}

export type PromoteAction = 'moved-to-top' | 'moved-to-prev-group' | 'moved-to-bottom'

export function promoteSubmission(
  dataDir: string,
  uuid: string,
  slug: string,
): PromoteAction {
  const all = readAll(dataDir)
  const slugSubs = all
    .filter(r => r.slug === slug)
    .sort((a, b) => a.timestamp - b.timestamp)

  const pos = slugSubs.findIndex(r => r.uuid === uuid)
  if (pos === -1) return 'moved-to-top'

  const groupIdx = Math.floor(pos / BATCH_SIZE)
  const posInGroup = pos % BATCH_SIZE

  let newTimestamp: number
  let action: PromoteAction

  if (groupIdx === 0 && posInGroup === 0) {
    // Absolute first → wrap to absolute last
    const last = slugSubs[slugSubs.length - 1]
    newTimestamp = (last?.timestamp ?? Date.now()) + 1
    action = 'moved-to-bottom'
  } else if (posInGroup === 0) {
    // Top of group but not first group → move to top of previous group
    const prevFirst = slugSubs[(groupIdx - 1) * BATCH_SIZE]
    newTimestamp = (prevFirst?.timestamp ?? 0) - 1
    action = 'moved-to-prev-group'
  } else {
    // Not at top of group → move to top of current group
    const groupFirst = slugSubs[groupIdx * BATCH_SIZE]
    newTimestamp = (groupFirst?.timestamp ?? 0) - 1
    action = 'moved-to-top'
  }

  const globalIdx = all.findIndex(r => r.uuid === uuid && r.slug === slug)
  if (globalIdx !== -1) {
    all[globalIdx] = { ...all[globalIdx], timestamp: newTimestamp }
    writeFileSync(manifestPath(dataDir), JSON.stringify(all, null, 2))
  }

  return action
}

export function moveSubmission(
  dataDir: string,
  uuid: string,
  fromSlug: string,
  toSlug: string,
): void {
  const all = readAll(dataDir)
  const idx = all.findIndex(r => r.uuid === uuid && r.slug === fromSlug)
  if (idx === -1) return
  all[idx] = { ...all[idx], slug: toSlug, timestamp: Date.now() }
  writeFileSync(manifestPath(dataDir), JSON.stringify(all, null, 2))
}

export function moveSubmissions(
  dataDir: string,
  uuids: string[],
  fromSlug: string,
  toSlug: string,
): { moved: string[]; failed: string[] } {
  const all = readAll(dataDir)
  const moved: string[] = []
  const failed: string[] = []
  const now = Date.now()

  for (const uuid of uuids) {
    const idx = all.findIndex(r => r.uuid === uuid && r.slug === fromSlug)
    if (idx === -1) {
      failed.push(uuid)
    } else {
      all[idx] = { ...all[idx], slug: toSlug, timestamp: now + moved.length }
      moved.push(uuid)
    }
  }

  if (moved.length > 0) {
    writeFileSync(manifestPath(dataDir), JSON.stringify(all, null, 2))
  }

  return { moved, failed }
}
