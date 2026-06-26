# Quickstart: Gallery Platform Expansion (007)

## Integration Scenarios

These are the end-to-end flows that can be verified once implementation is complete.

---

### Scenario 1: Browse galleries via header nav

1. Open the home page (`/`).
2. Observe the header right side shows two groups: **Public** (Hall of Faces, BrickCon 2026) and **Restricted** (Hall of Nobles, Game of Thrones, Seattle Faces).
3. Click "Hall of Faces" → navigates to `/hall-of-faces`.
4. The gallery page header shows "Hall of Faces" and description "open sharing of face mosaics".
5. Click "Game of Thrones" in the nav → navigates to `/game-of-thrones` showing "Game of Thrones characters" description.

**Verify**: All 5 galleries are linked and show correct descriptions.

---

### Scenario 2: Share a mosaic with a name to a public gallery

1. Complete the face shaping step (any mosaic).
2. Observe the **backing plate preview**: two small stacked diagrams appear to the right of the shaping canvas showing front (Top) and back (Bottom) plate layouts. Each plate piece has a border; pieces ≥ 2×4 show their dimension label.
3. Click **Confirm Mosaic**.
4. In the sharing form, observe: the "Name" field is pre-filled with a random phrase like "epic brick legend".
5. Observe: the gallery dropdown shows only "Hall of Faces" and "BrickCon 2026" (no restricted galleries).
6. Change name to "Jeff's Test Face".
7. Click **Share**. Submission succeeds and redirects to the gallery page.
8. On the gallery page, hover over the newly submitted mosaic → tooltip shows "Jeff's Test Face".

**Verify**: Name stored, tooltip works, public-only gallery selector enforced.

---

### Scenario 3: URL gallery pre-selection

1. Navigate to `/?gallery=brickcon-2026`.
2. Complete face shaping and reach the sharing form.
3. Observe: "BrickCon 2026" is pre-selected in the gallery dropdown.

**Verify**: URL parameter overrides default gallery.

---

### Scenario 4: Admin 4-button controls

1. Navigate to `/hall-of-faces?admin=true`.
2. Observe each occupied alcove shows 4 icon buttons: green ↑ (upper-left), grey checkbox (upper-right), blue ↓ (lower-left), red ✕ (lower-right).
3. Hover over the green ↑ on the top face → tooltip says "Move to bottom".
4. Hover over the green ↑ on the second face → tooltip says "Move to top of group" or "Move to top".
5. Click the blue ↓ on any face → the data JSON file downloads to your device.

**Verify**: Button positions and tooltips are correct.

---

### Scenario 5: Bulk select and move

1. Navigate to `/hall-of-faces?admin=true`.
2. Click the grey checkbox on faces A and B → both check marks appear.
3. Observe: a bulk action bar appears in the page header showing: All, Clear, Move (with gallery dropdown), Download, Delete.
4. Select "Hall of Nobles" from the Move dropdown and click Move.
5. Confirm the prompt.
6. Page reloads; faces A and B are no longer in Hall of Faces.
7. Navigate to `/hall-of-nobles?admin=true` → faces A and B appear there.

**Verify**: Cross-gallery move works; PNG + JSON files transferred.

---

### Scenario 6: Bulk download

1. Navigate to `/hall-of-faces?admin=true`.
2. Select 2 faces via checkbox.
3. Click "Download" in the bulk action bar.
4. Observe: 2 JSON files download to your device (individual downloads).

**Verify**: Data files are downloadable; contain correct MosaicDataFile structure.

---

### Scenario 7: Move-to-bottom wrap-around

1. Navigate to any gallery with at least 1 face in `?admin=true`.
2. Ensure one face is at position 1 (top of the gallery).
3. Hover over its green ↑ button → tooltip shows "Move to bottom".
4. Click it → face moves to the last position; page reloads.

**Verify**: Wrap-around behavior is correct and tooltip accurately predicts the action.
