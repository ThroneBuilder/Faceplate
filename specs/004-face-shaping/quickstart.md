# Quickstart / Integration Scenarios: Phase 004 — Face Shaping

## Scenario 1: Initial Mask on Mosaic Confirm

**Given**: User has confirmed a mosaic (phase transitions to `mosaic-confirmed`).

**Flow**:
1. `renderPhase` receives `mosaic-confirmed` state.
2. `onFaceShapingStart(state)` is called immediately (auto-transition, no user action).
3. `buildInitialMask(32, 32)` computes an ellipse mask.
4. Phase transitions to `face-shaping`.
5. `renderMaskEditor` fills the `mask-editor-grid` — center rows near-full-width visible, top/bottom corners masked.
6. `renderCubbyProjection` draws Cubby.JPEG + the ellipse-shaped mosaic overlay on `#cubby-canvas`.

**Validation**: The mask editor shows a portrait-oval of visible (full-colour) cells with dimmed corners. The cubby preview shows the mosaic appearing oval against the dark alcove background.

---

## Scenario 2: Click to Extend Left Mask

**Given**: Phase is `face-shaping`. Row 16 currently has `leftCol=4, rightCol=27`.

**User action**: Click cell at `(row=16, col=8)`.

**Expected**:
- `distLeft = 9`, `distRight = 24` → `edge = 'left'`
- `col=8 >= leftCol=4` → cell is visible → extend mask: `new leftCol = 9`
- Row 16 now has cols 9–27 visible (cols 0–8 masked / dimmed)
- Cubby projection redraws immediately with 9 dimmed columns on the left of row 16

**Code path**: `maskEditorGridEl click → onMaskCellClicked(state, 16, 8) → toggleMaskCell(mask, 16, 8) → renderMaskEditor + renderCubbyProjection`

---

## Scenario 3: Click to Retract Left Mask (Unmask)

**Given**: Row 16 has `leftCol=9` (cols 0–8 are masked). Same state as end of Scenario 2.

**User action**: Click cell at `(row=16, col=6)`.

**Expected**:
- `distLeft = 7`, `distRight = 26` → `edge = 'left'`
- `col=6 < leftCol=9` → cell is masked → retract mask: `new leftCol = 6`
- Row 16 now has cols 6–27 visible (cols 0–5 masked / dimmed)
- Cubby projection updates to show cols 6+ in row 16

---

## Scenario 4: Shadow at Face Boundary

**Given**: Phase is `face-shaping` with mask in ellipse shape.

**Observed in cubby projection**:
- For a row where `leftCol = 7`, the 3 columns to the left of col 7 (cols 4–6) in the cubby projection show a gradient darkening from the boundary outward.
- The gradient goes from ~35% black opacity at col 7's left edge to transparent at col 4's left edge.
- The Cubby.JPEG background (dark alcove bricks) is visible through the gradient — the shadow enhances depth.

---

## Scenario 5: Fully Masked Row (Corner of Ellipse)

**Given**: Row 0 is fully masked — `leftCol = 32, rightCol = -1` (outside ellipse).

**Observed in mask editor**: Row 0 shows all cells at 50% opacity (fully dimmed).
**Observed in cubby projection**: Row 0 contributes no brick pixels to the overlay; only cubby background shows.
**Shadow**: No shadow drawn for rows where `leftCol > rightCol` (fully masked).

---

## Scenario 6: Cubby Image Load Failure

**Given**: `loadCubbyImage()` rejects (network error or missing file).

**Expected**:
- `#cubby-canvas` shows a neutral grey fill matching the plate area dimensions.
- The mask editor remains fully functional.
- No error shown to the user (the shaping interaction still works).
- Console warning logged: `[face-shaping] Cubby image failed to load`.

---

## Test Scenarios for `buildInitialMask`

```typescript
const mask = buildInitialMask(32, 32)

// Center row should be nearly full-width
expect(mask.rows[16].leftCol).toBeLessThan(5)
expect(mask.rows[16].rightCol).toBeGreaterThan(27)

// Top row should be fully masked (outside ellipse)
expect(mask.rows[0].leftCol).toBeGreaterThan(mask.rows[0].rightCol)

// Mask is symmetric about center column (within 1 pixel)
const mid = 16
const lr = mask.rows[mid]
expect(Math.abs(lr.leftCol - (31 - lr.rightCol))).toBeLessThanOrEqual(1)
```

## Test Scenarios for `toggleMaskCell`

```typescript
const mask = buildInitialMask(32, 32)

// Extend left mask: click visible cell closer to left
const m1 = toggleMaskCell(mask, 16, 8)
expect(m1.rows[16].leftCol).toBe(9)

// Retract left mask: click same cell (now masked)
const m2 = toggleMaskCell(m1, 16, 8)
expect(m2.rows[16].leftCol).toBe(8)

// Double-toggle restores original
expect(m2.rows[16].leftCol).toBe(mask.rows[16].leftCol + (8 >= mask.rows[16].leftCol ? 0 : 0))
// (exact value depends on initial mask; key is m1 ≠ mask, m2 matches behaviour description)

// Right edge: click visible cell closer to right
const m3 = toggleMaskCell(mask, 16, 24)
expect(m3.rows[16].rightCol).toBe(23)

// Nearest edge (not a tie): W=6, col=3 → distLeft=4, distRight=3 → right edge chosen
const m4 = toggleMaskCell(buildInitialMask(6, 6), 3, 3)
expect(m4.rows[3].rightCol).toBe(2)

// True tiebreak: W=7, col=3 → distLeft=4, distRight=4 → left edge wins (spec FR-005 tiebreak)
const m5 = toggleMaskCell(buildInitialMask(7, 7), 3, 3)
expect(m5.rows[3].leftCol).toBe(4)
```
