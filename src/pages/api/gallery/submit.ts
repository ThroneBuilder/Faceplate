import type { APIRoute } from 'astro'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'

export const prerender = false

interface GalleryGroup { slug: string; displayName: string }
interface GalleryGroupsConfig { groups: GalleryGroup[] }

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

  // Validate group name against admin-created groups
  let config: GalleryGroupsConfig
  try {
    const configPath = join(process.cwd(), 'gallery-groups.json')
    config = JSON.parse(await readFile(configPath, 'utf8'))
  } catch {
    return json({ success: false, error: 'Server error — please try again' }, 500)
  }

  const group = config.groups.find(g => g.slug === groupName)
  if (!group) {
    return json({ success: false, error: 'Group not found — check the group name and try again' }, 404)
  }

  // Write PNG to public/gallery/{slug}/{uuid}.png
  try {
    const dir = join(process.cwd(), 'public', 'gallery', group.slug)
    await mkdir(dir, { recursive: true })
    const filename = `${randomUUID()}.png`
    const buffer = Buffer.from(await mosaicFile.arrayBuffer())
    await writeFile(join(dir, filename), buffer)
  } catch {
    return json({ success: false, error: 'Server error — please try again' }, 500)
  }

  return json({ success: true, redirectUrl: `/gallery/${group.slug}` })
}
