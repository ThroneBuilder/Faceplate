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

  const isJson = uuid.endsWith('.json')
  const isPng = !isJson

  // Sanitise uuid — strip extension then allow only alphanumeric and hyphens
  const uuidBase = uuid.replace(/\.(png|json)$/, '')
  if (!/^[a-f0-9-]+$/.test(uuidBase)) {
    return new Response('Not found', { status: 404 })
  }

  const filename = isPng ? `${uuidBase}.png` : `${uuidBase}.json`
  const filePath = join(GALLERY_DATA_DIR, slug, filename)
  const contentType = isPng ? 'image/png' : 'application/json'
  const cacheControl = isPng
    ? 'public, max-age=31536000'
    : 'public, max-age=86400'

  try {
    const data = await readFile(filePath)
    return new Response(data, {
      status: 200,
      headers: { 'Content-Type': contentType, 'Cache-Control': cacheControl },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
