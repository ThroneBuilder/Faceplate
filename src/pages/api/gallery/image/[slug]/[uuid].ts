import type { APIRoute } from 'astro'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { findGallery, GALLERY_DATA_DIR } from '../../../../../lib/gallery/config.js'

export const prerender = false

export const GET: APIRoute = async ({ params }) => {
  const { slug, uuid } = params

  if (!slug || !uuid) {
    return new Response('Not found', { status: 404 })
  }

  // Validate slug
  if (!findGallery(slug)) {
    return new Response('Gallery not found', { status: 404 })
  }

  // Sanitise uuid — allow only alphanumeric and hyphens
  if (!/^[a-f0-9-]+$/.test(uuid.replace(/\.png$/, ''))) {
    return new Response('Not found', { status: 404 })
  }

  const filename = uuid.endsWith('.png') ? uuid : `${uuid}.png`
  const filePath = join(GALLERY_DATA_DIR, slug, filename)

  try {
    const data = await readFile(filePath)
    return new Response(data, {
      status: 200,
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000' },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
