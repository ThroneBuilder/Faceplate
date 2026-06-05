# Quickstart / Integration Scenarios: Phase 006 — Hall of Faces Gallery

## Scenario 1: View an Empty Gallery

**Given**: `hall-of-faces` has no submissions.

**Flow**:
1. Browser navigates to `/hall-of-faces`
2. SSR page reads config → finds `hall-of-faces` (public, "Hall of Faces")
3. Reads `submissions.json` → 0 records for this slug
4. Renders page with `ceil(max(0,1)/6) = 1` Hall.JPEG composite, all slots null
5. Client-side script draws `Hall.JPEG` on the canvas, skips all cubby slots
6. All 6 cubbies show bare dark alcove from the photograph

**Validation**: Page loads, shows gallery header with correct name/description/link, and one Hall.JPEG image with no mosaics visible.

---

## Scenario 2: View a Gallery With 7 Submissions

**Given**: `hall-of-faces` has 7 submissions (timestamps t1 < t2 < … < t7).

**Flow**:
1. SSR page reads 7 records for slug, sorts by timestamp ascending
2. Splits into 2 batches: batch 0 = [t1..t6], batch 1 = [t7, null, null, null, null, null]
3. Renders 2 `<canvas>` elements with `window.GALLERY_BATCHES` containing 2 arrays
4. Client loads `Hall.JPEG` once
5. Batch 0 canvas: 6 submission PNGs composited into all 6 cubbies
6. Batch 1 canvas: t7 composited into slot 0 (top-left), slots 1–5 show bare alcove

**Validation**: Page shows 2 Hall.JPEG composites. First has 6 faces. Second has 1 face (top-left) and 5 empty cubbies.

---

## Scenario 3: Submit and See Result

**Given**: User completes face shaping at faceplate.me. Gallery "hall-of-faces" exists.

**Flow**:
1. User types "hall-of-faces" in "Add to Group" field (or arrives via `?hall=hall-of-faces` link)
2. Presses "Add to Group" → `POST /api/gallery/submit`
3. Server validates slug → found; writes PNG to `{GALLERY_DATA_DIR}/hall-of-faces/{uuid}.png`
4. Appends `{ uuid, slug: "hall-of-faces", timestamp, filename }` to `submissions.json`
5. Returns `{ success: true, redirectUrl: "/hall-of-faces" }`
6. Browser redirects to `/hall-of-faces`
7. SSR gallery page renders with the new submission included

**Validation**: The submitted mosaic is visible in the correct cubby slot immediately after redirect.

---

## Scenario 4: `?hall=` Pre-fill

**Given**: A visitor is on the `/hall-of-faces` gallery page.

**Flow**:
1. Visitor clicks "Add your face to this gallery ↗"
2. Browser navigates to `https://faceplate.me/?hall=hall-of-faces`
3. `index.astro` script reads `URLSearchParams.get('hall')` → "hall-of-faces"
4. Sets `groupNameInput.value = "hall-of-faces"`
5. User sees the face-shaping sidebar with "hall-of-faces" pre-filled in the group name input

**Validation**: Group name field is pre-filled; user does not need to type the gallery name.

---

## Scenario 5: Rebuild Preserves Submissions

**Given**: 5 submissions in `hall-of-faces`. Site is rebuilt and redeployed.

**Flow**:
1. New deploy starts; build output is overwritten
2. Persistent volume at `/data/gallery/` is NOT affected by the build
3. `submissions.json` still has 5 records; PNGs still present
4. First request to `/hall-of-faces` after deploy reads from persistent volume
5. Gallery shows all 5 submissions as before

**Validation**: Zero submissions lost across the rebuild cycle.

---

## Scenario 6: Hall of Nobles Not Discoverable

**Given**: User browses `hall-of-faces` and the home page.

**Expected**: No link, mention, or navigation element pointing to `/hall-of-nobles` appears on any public page.

**Validation**: Inspect page HTML of `/hall-of-faces` and `/` — neither contains the string "hall-of-nobles" or "Hall of Nobles" in any link or visible text.

---

## Calibration Scenario: Verify Cubby Slot Overlay

**Coordinates are pre-calibrated** (measured by the project owner: X at 22/50/78%, Y at 30/70%, scale 10% of image height). During implementation, verify with a debug overlay:

```javascript
// In gallery-composite.js, after drawing Hall.JPEG:
for (const slot of CUBBY_SLOTS) {
  const brickPx = Math.round(HALL_H * HALL_MOSAIC_SCALE / 32)  // = 4
  const mosaicW = 32 * brickPx   // = 128px  (for a 32-wide mosaic)
  const mosaicH = 32 * brickPx   // = 128px  (adjust for non-square mosaics)
  ctx.strokeStyle = 'red'
  ctx.lineWidth = 2
  ctx.strokeRect(
    slot.alcoveCx - mosaicW / 2,
    slot.alcoveCy - mosaicH / 2,
    mosaicW, mosaicH
  )
}
```

Expected: 6 red rectangles centred at (423,391), (962,391), (1500,391), (423,911), (962,911), (1500,911). Each ~128×128px. If adjustment is needed, update `CUBBY_SLOTS` in `src/lib/gallery/cubby-slots.ts`. Remove overlay before shipping.
