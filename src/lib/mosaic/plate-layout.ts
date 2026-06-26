import type { FaceMask, PlateLayoutResult, PlateSpec, BrickHeight } from '../../types/index.js'

// Piece candidates for front layer: horizontal-first, largest area first.
// For equal area, wider plate listed before taller.
const FRONT_PIECES: { w: number; h: number }[] = [
  { w: 16, h: 16 },
  { w: 16, h: 8 }, { w: 8, h: 16 },
  { w: 8, h: 8 },
  { w: 16, h: 4 }, { w: 4, h: 16 },
  { w: 8, h: 6 }, { w: 6, h: 8 },
  { w: 12, h: 4 }, { w: 4, h: 12 },
  { w: 8, h: 4 }, { w: 4, h: 8 },
  { w: 8, h: 3 }, { w: 3, h: 8 },
  { w: 8, h: 2 }, { w: 2, h: 8 },
  { w: 6, h: 4 }, { w: 4, h: 6 },
  { w: 6, h: 2 }, { w: 2, h: 6 },
  { w: 4, h: 4 },
  { w: 4, h: 3 }, { w: 3, h: 4 },
  { w: 4, h: 2 }, { w: 2, h: 4 },
  { w: 4, h: 1 }, { w: 1, h: 4 },
  { w: 3, h: 2 }, { w: 2, h: 3 },
  { w: 3, h: 1 }, { w: 1, h: 3 },
  { w: 2, h: 2 },
  { w: 2, h: 1 }, { w: 1, h: 2 },
  { w: 1, h: 1 },
]

// Piece candidates for back layer: vertical-first (seams staggered vs front).
// For equal area, taller plate listed before wider.
const BACK_PIECES: { w: number; h: number }[] = [
  { w: 16, h: 16 },
  { w: 8, h: 16 }, { w: 16, h: 8 },
  { w: 8, h: 8 },
  { w: 4, h: 16 }, { w: 16, h: 4 },
  { w: 6, h: 8 }, { w: 8, h: 6 },
  { w: 4, h: 12 }, { w: 12, h: 4 },
  { w: 4, h: 8 }, { w: 8, h: 4 },
  { w: 3, h: 8 }, { w: 8, h: 3 },
  { w: 2, h: 8 }, { w: 8, h: 2 },
  { w: 4, h: 6 }, { w: 6, h: 4 },
  { w: 2, h: 6 }, { w: 6, h: 2 },
  { w: 4, h: 4 },
  { w: 3, h: 4 }, { w: 4, h: 3 },
  { w: 2, h: 4 }, { w: 4, h: 2 },
  { w: 1, h: 4 }, { w: 4, h: 1 },
  { w: 2, h: 3 }, { w: 3, h: 2 },
  { w: 1, h: 3 }, { w: 3, h: 1 },
  { w: 2, h: 2 },
  { w: 1, h: 2 }, { w: 2, h: 1 },
  { w: 1, h: 1 },
]

export function computePlateLayout(
  mask: FaceMask,
  mosaicWidth: 32,
  mosaicHeight: BrickHeight,
): PlateLayoutResult {
  const rows = mosaicHeight
  const cols = mosaicWidth

  const inMask: boolean[][] = []
  for (let r = 0; r < rows; r++) {
    const row = mask.rows[r]
    const rowMask: boolean[] = new Array(cols).fill(false) as boolean[]
    if (row && row.leftCol <= row.rightCol) {
      for (let c = row.leftCol; c <= Math.min(row.rightCol, cols - 1); c++) {
        rowMask[c] = true
      }
    }
    inMask.push(rowMask)
  }

  const plates: PlateSpec[] = []

  function greedyLayout(pieces: { w: number; h: number }[]): number[][] {
    const grid: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0))
    const assigned: boolean[][] = Array.from({ length: rows }, () => new Array<boolean>(cols).fill(false))

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!inMask[r][c] || assigned[r][c]) continue

        for (const { w, h } of pieces) {
          if (r + h > rows || c + w > cols) continue

          let fits = true
          outer: for (let dr = 0; dr < h; dr++) {
            for (let dc = 0; dc < w; dc++) {
              if (!inMask[r + dr][c + dc] || assigned[r + dr][c + dc]) {
                fits = false
                break outer
              }
            }
          }

          if (fits) {
            const id = plates.length + 1
            plates.push({ id, width: w, height: h })
            for (let dr = 0; dr < h; dr++) {
              for (let dc = 0; dc < w; dc++) {
                grid[r + dr][c + dc] = id
                assigned[r + dr][c + dc] = true
              }
            }
            break
          }
        }
      }
    }

    return grid
  }

  const top = greedyLayout(FRONT_PIECES)
  const bottom = greedyLayout(BACK_PIECES)

  return { top, bottom, plates }
}
