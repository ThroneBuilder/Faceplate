import type { APIRoute } from 'astro'
import { rename, copyFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { mkdir } from 'node:fs/promises'
import { findGallery, GALLERY_DATA_DIR } from '../../../lib/gallery/config.js'
import { moveSubmissions } from '../../../lib/gallery/submissions.js'

export const prerender = false

export const POST: APIRoute = async ({ request }) => {
  const headers = { 'Content-Type': 'application/json' }
  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { status, headers })

  let body: { uuids?: string[]; fromSlug?: string; toSlug?: string }
  try {
    body = await request.json() as { uuids?: string[]; fromSlug?: string; toSlug?: string }
  } catch {
    return json({ success: false, error: 'Invalid JSON' }, 400)
  }

  const { uuids, fromSlug, toSlug } = body
  if (!Array.isArray(uuids) || uuids.length === 0 || !fromSlug || !toSlug) {
    return json({ success: false, error: 'uuids (array), fromSlug, and toSlug are required' }, 400)
  }

  if (fromSlug === toSlug) {
    return json({ success: false, error: 'Source and destination gallery are the same' }, 400)
  }

  if (!findGallery(fromSlug)) {
    return json({ success: false, error: 'Source gallery not found' }, 404)
  }
  if (!findGallery(toSlug)) {
    return json({ success: false, error: 'Destination gallery not found' }, 404)
  }

  const fromDir = join(GALLERY_DATA_DIR, fromSlug)
  const toDir = join(GALLERY_DATA_DIR, toSlug)
  await mkdir(toDir, { recursive: true })

  const fileMoved: string[] = []
  const fileFailed: string[] = []

  for (const uuid of uuids) {
    // Only allow UUID-format strings
    if (!/^[a-f0-9-]+$/.test(uuid)) { fileFailed.push(uuid); continue }

    for (const ext of ['.png', '.json'] as const) {
      const src = join(fromDir, `${uuid}${ext}`)
      const dst = join(toDir, `${uuid}${ext}`)
      try {
        await rename(src, dst)
      } catch {
        // Cross-device rename falls back to copy+delete
        try {
          await copyFile(src, dst)
          await unlink(src).catch(() => {})
        } catch {
          // File may not exist (e.g. no .json for old submissions) — not fatal
        }
      }
    }
    fileMoved.push(uuid)
  }

  const { moved, failed } = moveSubmissions(GALLERY_DATA_DIR, fileMoved, fromSlug, toSlug)

  return json({ success: true, moved, failed: [...failed, ...fileFailed] })
}
