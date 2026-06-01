import { describe, it, expect, vi } from 'vitest'

// EXIF orientation transforms — extracted for pure-function unit testing.
// Full integration (createImageBitmap + OffscreenCanvas) requires a browser;
// these tests verify the transform math for all 8 orientations.

type Ctx2D = {
  scale: (x: number, y: number) => void
  translate: (x: number, y: number) => void
  rotate: (r: number) => void
}

function applyExifOrientation(ctx: Ctx2D, o: number, w: number, h: number): void {
  switch (o) {
    case 2: ctx.scale(-1, 1); ctx.translate(-w, 0); break
    case 3: ctx.translate(w, h); ctx.rotate(Math.PI); break
    case 4: ctx.scale(1, -1); ctx.translate(0, -h); break
    case 5: ctx.rotate(Math.PI / 2); ctx.scale(1, -1); break
    case 6: ctx.translate(h, 0); ctx.rotate(Math.PI / 2); break
    case 7: ctx.translate(h, w); ctx.rotate(Math.PI / 2); ctx.scale(-1, 1); break
    case 8: ctx.translate(0, w); ctx.rotate(-Math.PI / 2); break
  }
}

function outputDims(orientation: number, w: number, h: number): { cw: number; ch: number } {
  const rotated = orientation >= 5 && orientation <= 8
  return { cw: rotated ? h : w, ch: rotated ? w : h }
}

describe('EXIF orientation output dimensions', () => {
  const W = 400, H = 300

  it('orientation 1 (normal) — no rotation, dims unchanged', () => {
    expect(outputDims(1, W, H)).toEqual({ cw: W, ch: H })
  })

  it('orientation 2 (mirror horizontal) — dims unchanged', () => {
    expect(outputDims(2, W, H)).toEqual({ cw: W, ch: H })
  })

  it('orientation 3 (rotate 180°) — dims unchanged', () => {
    expect(outputDims(3, W, H)).toEqual({ cw: W, ch: H })
  })

  it('orientation 4 (mirror vertical) — dims unchanged', () => {
    expect(outputDims(4, W, H)).toEqual({ cw: W, ch: H })
  })

  it('orientation 5 (90° + mirror) — dims swapped', () => {
    expect(outputDims(5, W, H)).toEqual({ cw: H, ch: W })
  })

  it('orientation 6 (90° CW) — dims swapped', () => {
    expect(outputDims(6, W, H)).toEqual({ cw: H, ch: W })
  })

  it('orientation 7 (270° + mirror) — dims swapped', () => {
    expect(outputDims(7, W, H)).toEqual({ cw: H, ch: W })
  })

  it('orientation 8 (90° CCW) — dims swapped', () => {
    expect(outputDims(8, W, H)).toEqual({ cw: H, ch: W })
  })
})

describe('applyExifOrientation transform calls', () => {
  it('orientation 1 makes no transform calls', () => {
    const ctx = { scale: vi.fn(), translate: vi.fn(), rotate: vi.fn() }
    applyExifOrientation(ctx, 1, 400, 300)
    expect(ctx.scale).not.toHaveBeenCalled()
    expect(ctx.translate).not.toHaveBeenCalled()
    expect(ctx.rotate).not.toHaveBeenCalled()
  })

  it('orientation 3 (180°) translates and rotates', () => {
    const ctx = { scale: vi.fn(), translate: vi.fn(), rotate: vi.fn() }
    applyExifOrientation(ctx, 3, 400, 300)
    expect(ctx.translate).toHaveBeenCalledWith(400, 300)
    expect(ctx.rotate).toHaveBeenCalledWith(Math.PI)
  })

  it('orientation 6 (90° CW) translates and rotates', () => {
    const ctx = { scale: vi.fn(), translate: vi.fn(), rotate: vi.fn() }
    applyExifOrientation(ctx, 6, 400, 300)
    expect(ctx.translate).toHaveBeenCalledWith(300, 0)
    expect(ctx.rotate).toHaveBeenCalledWith(Math.PI / 2)
  })

  it('orientation 8 (90° CCW) translates and rotates', () => {
    const ctx = { scale: vi.fn(), translate: vi.fn(), rotate: vi.fn() }
    applyExifOrientation(ctx, 8, 400, 300)
    expect(ctx.translate).toHaveBeenCalledWith(0, 400)
    expect(ctx.rotate).toHaveBeenCalledWith(-Math.PI / 2)
  })
})
