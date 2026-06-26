import type { APIRoute } from 'astro'
import { unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { findGallery, GALLERY_DATA_DIR } from '../../../lib/gallery/config.js'
import { deleteSubmission } from '../../../lib/gallery/submissions.js'

export const prerender = false

export const POST: APIRoute = async ({ request }) => {
  const headers = { 'Content-Type': 'application/json' }
  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { status, headers })

  let body: { uuid?: string; slug?: string }
  try {
    body = await request.json() as { uuid?: string; slug?: string }
  } catch {
    return json({ success: false, error: 'Invalid JSON' }, 400)
  }

  const { uuid, slug } = body
  if (!uuid || !slug) {
    return json({ success: false, error: 'uuid and slug are required' }, 400)
  }

  const gallery = findGallery(slug)
  if (!gallery) {
    return json({ success: false, error: 'Gallery not found' }, 404)
  }

  try {
    deleteSubmission(GALLERY_DATA_DIR, uuid, slug)
  } catch {
    return json({ success: false, error: 'Failed to update manifest' }, 500)
  }

  const dir = join(GALLERY_DATA_DIR, slug)
  await Promise.all([
    unlink(join(dir, `${uuid}.png`)).catch(() => {}),
    unlink(join(dir, `${uuid}.json`)).catch(() => {}),
  ])

  return json({ success: true })
}
