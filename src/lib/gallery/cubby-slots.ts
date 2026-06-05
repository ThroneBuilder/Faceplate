export const HALL_W = 1923
export const HALL_H = 1302
// A 32-brick mosaic occupies 10% of HALL_H.
// brickPx = Math.round(HALL_H * HALL_MOSAIC_SCALE / mosaicBrickHeight)
export const HALL_MOSAIC_SCALE = 0.18225

export interface CubbySlot {
  row: 0 | 1
  col: 0 | 1 | 2
  alcoveCx: number
  alcoveCy: number
}

// Calibrated: X at 22/50/78 % of HALL_W; Y at 30/70 % of HALL_H
export const CUBBY_SLOTS: CubbySlot[] = [
  { row: 0, col: 0, alcoveCx: 423,  alcoveCy: 391 },
  { row: 0, col: 1, alcoveCx: 962,  alcoveCy: 391 },
  { row: 0, col: 2, alcoveCx: 1500, alcoveCy: 391 },
  { row: 1, col: 0, alcoveCx: 423,  alcoveCy: 911 },
  { row: 1, col: 1, alcoveCx: 962,  alcoveCy: 911 },
  { row: 1, col: 2, alcoveCx: 1500, alcoveCy: 911 },
]
