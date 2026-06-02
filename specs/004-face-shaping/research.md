# Research: Phase 004 — Face Shaping

## Decision 1: Mask Data Structure

**Decision**: Per-row `{ leftCol, rightCol }` array, one entry per mosaic row (length = `mosaic.height`). Visible cells are those in the inclusive range `[leftCol, rightCol]`. Cells outside that range are masked (dimmed at ~50% opacity in the editor; absent in the cubby projection).

**Rationale**: Direct mapping to the click-to-edge operation (one update per click touches exactly one row entry). O(1) lookup and update. Contiguity of masked regions is structurally guaranteed — no invalid states. A boolean grid would require enforcing contiguity separately and costs `width × height` memory instead of `2 × height` integers.

**Alternatives considered**:
- Per-cell boolean grid: enforcing contiguous masked regions requires extra validation; larger state.
- Run-length encoding: unnecessary complexity; rows are short (≤32 columns).

---

## Decision 2: Initial Mask Algorithm

**Decision**: Ellipse inscribed in the mosaic brick grid, centred at `(width/2, height/2)`, with horizontal semi-axis `= width * 0.40` and vertical semi-axis `= height * 0.48`. For each row `r`, compute the ellipse x-radius at that height and set `leftCol = max(0, floor(cx - rx))`, `rightCol = min(W-1, ceil(cx + rx))`.

**Rationale**: Portrait head photos fill the crop region; an ellipse with slightly inset horizontal radius produces a natural oval face silhouette without requiring head-detection bounds to be carried through the state machine. The current `mosaic-confirmed` state does not persist `HeadBounds` (the head-cropping phase discards them after setting handles). Adding `headBounds` to `HeadCropSelection` is deferred to a future phase when the accuracy improvement is validated by user testing.

**Alternatives considered**:
- Store `HeadBounds` through to `mosaic-confirmed`: accurate but adds a field to `HeadCropSelection` that downstream phases do not currently consume; deferred.
- Fixed column margin (e.g., mask 3 columns on each side): ignores vertical variation; gives rectangular rather than oval result.
- Full-width initial mask (no masking): forces the user to trim manually every time.

---

## Decision 3: Click-Toggle Semantics

**Decision**: For a click at `(row, col)`:
1. Determine nearest edge: `edge = (col < width/2) ? 'left' : 'right'`
2. Check if clicked cell is currently masked:
   - Left: `isMasked = (col < mask.rows[row].leftCol)`
   - Right: `isMasked = (col > mask.rows[row].rightCol)`
3. Update boundary:
   - Left + unmasked → `leftCol = col + 1` (extend mask rightward to include col)
   - Left + masked → `leftCol = col` (retract mask, expose col)
   - Right + unmasked → `rightCol = col - 1` (extend mask leftward to include col)
   - Right + masked → `rightCol = col` (retract mask, expose col)

**Rationale**: Clean two-state toggle at a per-row level. "Mask all cells to the nearest edge" is achieved by moving the boundary to the clicked column. "If already masked, unmask" reverses the boundary by one step, exposing the clicked cell. The operation is self-inverting (two clicks at the same cell returns to the original state).

**Equidistant tiebreak**: left edge wins (as specified in FR-005 and clarified in spec).

---

## Decision 4: Cubby Projection Rendering

**Decision**: Full HTML5 Canvas 2D redraw on every mask change. Steps:
1. `ctx.drawImage(cubbyImg, 0, 0)` — draw the full Cubby.JPEG background
2. Translate/scale to the plate region `(PLATE_X, PLATE_Y, PLATE_W, PLATE_H)`
3. For each mosaic cell `(row, col)` where `leftCol ≤ col ≤ rightCol`: fill a scaled rectangle with the brick colour
4. Draw the shadow overlay at face boundary edges

**Rationale**: The mosaic is at most 32×36 bricks; scaled to the plate (≈340px), each brick is ~10px. A full redraw costs <1ms on any modern device. No dirty-region tracking needed; code remains simple and correct.

**Alternatives considered**:
- Dirty-region partial redraws: saves <0.5ms; not worth the complexity.
- OffscreenCanvas + `transferToImageBitmap`: no advantage at this size; adds complexity with no measurable gain.

---

## Decision 5: Shadow Rendering

**Decision**: For each row `r`, at the left boundary (`leftCol`) and right boundary (`rightCol`), draw a canvas linear gradient rectangle extending 3 brick-widths outward into the masked area. Gradient: `rgba(0,0,0,0.35)` at the face edge fading to `rgba(0,0,0,0)` at the outer end. Applied after all brick fills so it overlays the background.

**Rationale**: Deterministic (no browser filter APIs), simple to implement, produces a convincing depth shadow. The 3-brick shadow width (~30px at 10px/brick) matches the visual scale of the cubby photograph.

**Alternatives considered**:
- CSS box-shadow: cannot be applied to canvas regions.
- Canvas `shadowBlur` filter: applies globally to subsequent draw calls, requiring save/restore gymnastics; harder to control per-row.
- Image convolution blur: overkill; determinism concerns with float rounding.

---

## Decision 6: Cubby Plate Coordinates

**Decision**: Hardcoded constants `PLATE_X`, `PLATE_Y`, `PLATE_W`, `PLATE_H` (pixels within Cubby.JPEG at its native 1682 × 1457 resolution).

**Initial estimate** (from visual measurement of the 1682×1457 image):
```
PLATE_X = 671   // left edge of white plate
PLATE_Y = 585   // top edge of white plate
PLATE_W = 340   // plate width in pixels
PLATE_H = 350   // plate height in pixels
```

**Calibration approach**: During implementation, render these constants as an overlay on the Cubby.JPEG in the browser devtools. Adjust until the overlay matches the plate boundary exactly. Commit calibrated values before shipping.

**Rationale**: The white plate is a fixed feature of the photograph; it will not change. A runtime measurement algorithm (scan for white rectangle) is fragile against JPEG compression artefacts. Hardcoded constants are reliable and documented.

---

## Decision 7: Mosaic Scaling into Plate Region

**Decision**: Scale the mosaic to fill `PLATE_W × PLATE_H` maintaining the mosaic's true aspect ratio (`width:height` in bricks). Centre the scaled mosaic within the plate. Each brick cell is drawn as a filled rectangle of `brickPxW × brickPxH` pixels.

**Rationale**: The mosaic aspect ratio varies by crop (portrait heads are typically taller than wide, or near-square). Forcing square bricks would distort the image. Scaling to fill with aspect-correct bricks centred in the plate is consistent with how physical mosaic plates are mounted.

**Brick pixel dimensions**:
```
scale = min(PLATE_W / mosaic.width, PLATE_H / mosaic.height)
brickPx = floor(scale)
offsetX = PLATE_X + floor((PLATE_W - brickPx * mosaic.width)  / 2)
offsetY = PLATE_Y + floor((PLATE_H - brickPx * mosaic.height) / 2)
```
