import type { APIRoute } from 'astro'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { findGallery, GALLERY_DATA_DIR } from '../../../lib/gallery/config.js'
import { appendSubmission } from '../../../lib/gallery/submissions.js'

export const prerender = false

export const POST: APIRoute = async ({ request }) => {
  const headers = { 'Content-Type': 'application/json' }
  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { status, headers })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return json({ success: false, error: 'Invalid request' }, 400)
  }

  const name = (formData.get('name') as string | null)?.trim() ?? ''
  if (!name || name.length > 80) {
    return json({ success: false, error: 'Name is required (max 80 characters)' }, 400)
  }

  const groupName = (formData.get('group_name') as string | null)?.trim() ?? ''
  if (!groupName || groupName.length > 64) {
    return json({ success: false, error: 'Group name is required (max 64 characters)' }, 400)
  }

  const mosaicFile = formData.get('mosaic') as File | null
  if (!mosaicFile) {
    return json({ success: false, error: 'Mosaic image is required' }, 400)
  }
  if (mosaicFile.size > 2 * 1024 * 1024) {
    return json({ success: false, error: 'Image too large (max 2 MB)' }, 413)
  }

  const group = findGallery(groupName)
  if (!group) {
    return json({ success: false, error: 'Group not found — check the group name and try again' }, 404)
  }
  if (group.visibility !== 'public') {
    return json({ success: false, error: 'Submissions are only allowed to public galleries' }, 403)
  }

  const uuid = randomUUID()
  const filename = `${uuid}.png`

  try {
    const dir = join(GALLERY_DATA_DIR, group.slug)
    await mkdir(dir, { recursive: true })
    const buffer = Buffer.from(await mosaicFile.arrayBuffer())
    await writeFile(join(dir, filename), buffer)
    const jsonFile = formData.get('mosaic_json') as File | null
    if (jsonFile) {
      const jsonBuffer = Buffer.from(await jsonFile.arrayBuffer())
      await writeFile(join(dir, `${uuid}.json`), jsonBuffer)
    }
  } catch {
    return json({ success: false, error: 'Server error — please try again' }, 500)
  }

  try {
    appendSubmission(GALLERY_DATA_DIR, {
      uuid,
      slug: group.slug,
      timestamp: Date.now(),
      filename,
      name,
    })
  } catch {
    console.error('[gallery] Failed to append submission to manifest')
  }

  return json({ success: true, redirectUrl: `/${group.slug}` })
}
