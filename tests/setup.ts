// Minimal ImageData polyfill for Node test environment.
// The canvas npm package requires native compilation (unavailable here);
// our lib functions only need data/width/height — no actual canvas rendering.

class NodeImageData {
  readonly data: Uint8ClampedArray
  readonly width: number
  readonly height: number
  readonly colorSpace: PredefinedColorSpace = 'srgb'

  constructor(sw: number, sh: number)
  constructor(data: Uint8ClampedArray, sw: number, sh?: number)
  constructor(
    swOrData: number | Uint8ClampedArray,
    sh: number,
    shOrUndef?: number,
  ) {
    if (typeof swOrData === 'number') {
      this.width = swOrData
      this.height = sh
      this.data = new Uint8ClampedArray(swOrData * sh * 4)
    } else {
      this.data = swOrData
      this.width = sh
      this.height = shOrUndef ?? swOrData.length / 4 / sh
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).ImageData = NodeImageData
