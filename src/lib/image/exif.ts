import { parse } from 'exifr/dist/lite.esm.js'

export async function getOrientedImageData(file: File): Promise<ImageData> {
  const exif = await parse(file, { pick: ['Orientation'] }).catch(() => null) as { Orientation?: number } | null
  const orientation: number = exif?.Orientation ?? 1

  const bitmap = await createImageBitmap(file)
  const { width: sw, height: sh } = bitmap

  // Orientations 5-8 are 90° or 270° rotations — swap canvas dimensions
  const rotated = orientation >= 5 && orientation <= 8
  const cw = rotated ? sh : sw
  const ch = rotated ? sw : sh

  const canvas = new OffscreenCanvas(cw, ch)
  const ctx = canvas.getContext('2d')!
  applyExifOrientation(ctx, orientation, sw, sh)
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()

  return ctx.getImageData(0, 0, cw, ch)
}

function applyExifOrientation(
  ctx: OffscreenCanvasRenderingContext2D,
  o: number,
  w: number,
  h: number,
): void {
  switch (o) {
    case 2: ctx.scale(-1, 1);  ctx.translate(-w, 0); break
    case 3: ctx.translate(w, h); ctx.rotate(Math.PI); break
    case 4: ctx.scale(1, -1);  ctx.translate(0, -h); break
    case 5: ctx.rotate(Math.PI / 2); ctx.scale(1, -1); break
    case 6: ctx.translate(h, 0); ctx.rotate(Math.PI / 2); break
    case 7: ctx.translate(h, w); ctx.rotate(Math.PI / 2); ctx.scale(-1, 1); break
    case 8: ctx.translate(0, w); ctx.rotate(-Math.PI / 2); break
    // case 1: identity — no transform needed
  }
}
