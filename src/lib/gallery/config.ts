import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const GALLERY_DATA_DIR =
  process.env.GALLERY_DATA_DIR ?? join(process.cwd(), 'gallery-data')

export interface GalleryGroup {
  slug: string
  displayName: string
  description: string
  visibility: 'public' | 'unlisted'
}

let _groups: GalleryGroup[] | null = null

export function getGalleries(): GalleryGroup[] {
  if (_groups) return _groups
  const raw = JSON.parse(
    readFileSync(join(process.cwd(), 'gallery-groups.json'), 'utf8')
  ) as { groups: GalleryGroup[] }
  _groups = raw.groups
  return _groups
}

export function findGallery(slug: string): GalleryGroup | undefined {
  return getGalleries().find(g => g.slug === slug)
}
