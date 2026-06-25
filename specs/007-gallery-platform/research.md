# Research: Gallery Platform Expansion (007)

## Decision 1: Backing Plate Decomposition Algorithm

**Decision**: Greedy largest-fit rectangle packing, two passes with orthogonal orientations.

**Rationale**: LEGO mosaic frames require two physical layers of plate pieces for structural rigidity. The standard technique is to orient the back layer perpendicular to the front so the seams are staggered. A greedy largest-fit algorithm is fast (O(n²) worst case on a 32×36 grid = ~1,152 cells), deterministic, and produces reasonable results for a constrained grid. No heap or dynamic programming needed at this scale.

**Algorithm detail**:
- **Front layer (Top)**: Scan raster order (row-major). At each unassigned masked cell, try pieces in descending area order — 2×8, 2×6, 2×4, 2×3, 2×2, 1×4, 1×3, 1×2, 1×1 — oriented horizontally (width ≥ height). Place the largest piece that fits entirely within the mask. Assign all cells of that piece the same plate index.
- **Back layer (Bottom)**: Same algorithm but preferred piece orientation is vertical (height ≥ width), using pieces: 8×2, 6×2, 4×2, 3×2, 2×2, 4×1, 3×1, 2×1, 1×1. This ensures back seams are staggered relative to front for rigidity.
- **Piece set** (standard LEGO plates): 1×1, 1×2, 1×3, 1×4, 2×1, 2×2, 2×3, 2×4, 2×6, 2×8 and their transpositions.
- **Label threshold**: Pieces with width ≥ 4 AND height ≥ 2 (or height ≥ 4 AND width ≥ 2) display dimensions; smaller pieces show border only.

**Alternatives considered**:
- Optimal rectangle packing (NP-hard): Rejected — overkill for display purposes, not needed for buildability.
- Single layer: Rejected — a single plate layer lacks structural integrity for a 32×36 mosaic.
- Column-major first: Considered — front horizontal / back vertical is the established community practice.

---

## Decision 2: Gallery Visibility Model

**Decision**: Retain existing `visibility: 'public' | 'unlisted'` field in `GalleryGroup`. Map `'public'` → "Public" nav group; `'unlisted'` → "Restricted" nav group in UI.

**Rationale**: The existing type already captures the distinction. Renaming to `public: boolean` would require a migration and breaking change. The UI labels ("Public" / "Restricted") are display-only and do not need to match the code field name.

**Alternatives considered**:
- `public: boolean`: Simpler for the spec, but a breaking field rename — rejected.
- Separate `restricted` group metadata: Over-engineered for current scale.

---

## Decision 3: Data Export Format — JSON over CSV

**Decision**: Replace the current `{uuid}.csv` file with `{uuid}.json` containing the full structured mosaic data.

**Rationale**:
- JSON supports nested arrays (color matrix, plate index maps) natively; CSV requires flattened multi-line sections that are fragile to parse.
- The data format is hierarchical by nature (Mosaic → layers → parts list); JSON is the natural fit.
- Existing tooling (Node.js `JSON.parse`, browser fetch) handles JSON without a parser library.
- `{uuid}.json` replaces `{uuid}.csv` — one file per submission, same naming convention.

**JSON structure**:
```json
{
  "name": "awesome brick champion",
  "date": "2026-06-25T14:30:00Z",
  "size": 32,
  "brightness": 10,
  "contrast": 0,
  "mosaic": [[colorId, ...], ...],
  "top": [[plateIndex, ...], ...],
  "bottom": [[plateIndex, ...], ...],
  "plates": [{ "id": 1, "width": 4, "height": 2 }, ...],
  "parts": [{ "name": "White", "partNumber": "3023", "color": "#f2f3f2", "count": 42 }, ...]
}
```
- `mosaic[r][c]` = LEGO color ID (0 = masked)
- `top[r][c]` = plate index into `plates` array (0 = masked)
- `bottom[r][c]` = plate index into `plates` array (0 = masked)
- `plates` = lookup table: index `i` → `plates[i-1]` (1-indexed in grids)

**Alternatives considered**:
- Keep CSV, add supplemental JSON: Rejected — two files per submission with overlapping data.
- CSV with embedded JSON sections: Rejected — non-standard, hard to parse.

---

## Decision 4: Admin Control Layout (4-button cubby)

**Decision**: Replace current 2-button layout (promote lower-left, delete lower-right) with 4-button layout occupying all four corners.

**Current state (just implemented in this session)**:
- Lower-left: green ⌃ (promote/move to top)
- Lower-right: red ✕ (delete)

**New layout**:
- Upper-left: green ↑ (Move — 3-state behavior: top-of-group → top-of-previous-group → bottom)
- Upper-right: grey □ (Select for bulk action)
- Lower-left: blue ↓ (Download JSON data file)
- Lower-right: red ✕ (Delete — existing, position unchanged)

The promote endpoint (`/api/gallery/promote`) is already implemented but the move behavior needs to be extended to support the 3-state wrap-around logic (FR-021).

**Alternatives considered**:
- Context menu: Rejected — extra click; icons are faster for power users.
- Floating toolbar on hover: Rejected — harder to hit precisely on small mosaics.

---

## Decision 5: Header Navigation Architecture

**Decision**: Create a shared `src/components/GalleryNav.astro` component that reads gallery groups and renders the two-column nav. Import this in `[gallery].astro`; the main `index.astro` page also imports it for the share flow.

**Rationale**: Currently `index.astro` and `[gallery].astro` each render their own header. A shared component avoids drift and ensures the gallery list is consistent everywhere.

**Alternatives considered**:
- Copy-paste nav into each page: Rejected — maintenance burden.
- Astro layout file: Considered for the gallery page only; GalleryNav component is lighter and more composable.

---

## Decision 6: Submission Name Storage

**Decision**: Add `name: string` to the `SubmissionRecord` interface. Store at submission time; pass through all move/promote/delete operations. Display as tooltip via `title` attribute on the canvas element or an overlay `<span>`.

**Rationale**: The name is logically part of the submission record, not just the data file. Storing it in the manifest (`submissions.json`) means the gallery page can render tooltips without parsing the JSON file per submission.

**Alternatives considered**:
- Parse JSON file per-submission on gallery page load: Rejected — O(n) file reads per page render.
- Store in a separate names manifest: Rejected — synchronization complexity.

---

## Decision 7: Gallery Move (Cross-Gallery) Implementation

**Decision**: New `POST /api/gallery/move` endpoint. Moves files (PNG + JSON) from source gallery directory to target gallery directory. Updates manifest entries in both source and target. Accepts `{ uuids: string[], fromSlug: string, toSlug: string }`.

**Bulk move**: Same endpoint accepts an array of uuids. Files are moved atomically per-file; partial failures are reported but do not block successful moves.

**Alternatives considered**:
- Rename files in place (add slug prefix to filename): Rejected — directory-based isolation already in use.
- Copy-then-delete vs rename: Use `fs.rename`/`mv` for atomicity within the same filesystem; fallback to copy+delete across mounts.

---

## Decision 8: Random Name Generator

**Decision**: Client-side function using three embedded wordlists. Format: `{extreme adjective} {brick adjective} {noun}`.

**Wordlists** (suggested, 10+ entries each):
- Extreme adjectives: awesome, epic, legendary, supreme, ultimate, radical, elite, stellar, maximum, fierce
- Brick adjectives: brick, stud, mosaic, pixel, plate, block, tile, lego, builder, master
- Fanatic nouns: champion, fanatic, legend, wizard, guru, hero, maestro, titan, genius, ace

Seeded by `Math.random()` — no external service.

**Alternatives considered**:
- API-generated names: Rejected — unnecessary network call; violates simplicity principle.
- UUID-based names: Rejected — not fun or memorable.
