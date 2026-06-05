# Research: Phase 006 — Hall of Faces Gallery Pages

## Decision 1: Persistent Submission Storage

**Decision**: Store submitted PNGs on a server-side **persistent volume** mounted at `/data`, outside the Astro build output directory. Submission metadata (uuid, gallery slug, timestamp) is accumulated in a JSON append-log at `/data/gallery/submissions.json`. PNG files are stored at `/data/gallery/{slug}/{uuid}.png`.

**Rationale**: The Phase 005 implementation stored PNGs in `public/gallery/`, which is overwritten on each redeploy. Moving to `/data/` (a Render.com persistent disk, or any server-side volume) survives rebuilds by design. The gallery page reads from `/data/` at request time (SSR). PNG files are served via an SSR API route that streams from the persistent volume — this keeps the serving path consistent regardless of the build output.

**Alternatives considered**:
- `public/gallery/` with a persistent disk mounted AT that path: works but is fragile if Astro ever writes to that directory during build.
- External object storage (S3/R2): introduces third-party dependency; the masked mosaic PNGs are derived outputs that the constitution permits to store on first-party infrastructure, so object storage is acceptable but adds complexity.
- Base64 JSON: works for a small gallery, does not scale for many submissions.

**Deployment note**: On Render.com, a Disk is attached to the web service and mounted at `/data`. The path is configurable via environment variable `GALLERY_DATA_DIR` (default: `/data/gallery`). In local development, this directory can be at the project root under `gallery-data/` (gitignored).

---

## Decision 2: Gallery Routing

**Decision**: A single dynamic Astro SSR page at `src/pages/[gallery].astro` handles all gallery slugs. On each request, it looks up the slug in the gallery config, reads submissions from the manifest, and renders the page. A 404 response is returned for unknown slugs.

**Rationale**: Avoids duplicating three identical page files. The config drives which slugs are valid. Adding a gallery is just adding to the config.

**Phase 005 migration**: The `/gallery/[slug].astro` stub from Phase 005 is deleted; replaced by a redirect or removed entirely. The `/api/gallery/submit` route's `redirectUrl` is updated from `/gallery/{slug}` to `/{slug}`.

---

## Decision 3: Gallery Configuration Format

**Decision**: Extend `gallery-groups.json` with `description` and `visibility` fields and seed the three production galleries. Replace the `test-group` test entry with the real galleries.

```json
{
  "groups": [
    {
      "slug": "hall-of-faces",
      "displayName": "Hall of Faces",
      "description": "[Administrator-provided description — replace before launch]",
      "visibility": "public"
    },
    {
      "slug": "hall-of-nobles",
      "displayName": "Hall of Nobles",
      "description": "[Administrator-provided description — replace before launch]",
      "visibility": "unlisted"
    },
    {
      "slug": "brickcon-2026",
      "displayName": "BrickCon 2026",
      "description": "[Administrator-provided description — replace before launch]",
      "visibility": "public"
    }
  ]
}
```

**Visibility semantics**: `public` galleries may be linked from any page. `unlisted` galleries exist at their URL but are never linked or indexed.

---

## Decision 4: Submission Image API

**Decision**: Submitted PNGs are served via an SSR API route `GET /api/gallery-image/[slug]/[uuid].png` that reads the file from the persistent volume and streams it with `Content-Type: image/png`. This keeps serving consistent when the persistent volume is outside the Astro static output.

**Rationale**: If PNGs were in `public/gallery/`, they'd be served as static assets — but moving to `/data/` requires a streaming endpoint. The overhead is minimal for small galleries.

---

## Decision 5: Gallery Page Canvas Compositing

**Decision**: Client-side Canvas 2D compositing. The gallery SSR page renders:
1. A `<script>` block with the ordered submission URL array per `Hall.JPEG` composite
2. One `<canvas>` element per composite (one per 6 submissions)

On page load, JavaScript loads `Hall.JPEG` once and each submission PNG, then composites them into the canvas using the calibrated cubby slot coordinates. This is structurally identical to the Phase 005 Cubby.JPEG overlay.

---

## Decision 6: Hall.JPEG Cubby Calibration

**Decision**: 6 sets of calibration constants `(ALCOVE_CX, ALCOVE_CY, ALCOVE_H_PX)` — one per cubby slot — derived empirically from `Hall.JPEG` (1923×1302 px) using a debug overlay during implementation. The brick scale formula is the same as Phase 005: `brickPx = round(ALCOVE_H_PX / 56 * 0.57)`.

**Calibrated values** (measured by project owner against Hall.JPEG):

| Slot | Row | Col | ALCOVE_CX | ALCOVE_CY |
|------|-----|-----|-----------|-----------|
| 0    | 0   | 0   | 423       | 391       |
| 1    | 0   | 1   | 962       | 391       |
| 2    | 0   | 2   | 1500      | 391       |
| 3    | 1   | 0   | 423       | 911       |
| 4    | 1   | 1   | 962       | 911       |
| 5    | 1   | 2   | 1500      | 911       |

Centres derived from: X at 22%, 50%, 78% of HALL_W (1923); Y at 30%, 70% of HALL_H (1302).

**Scale**: A 32-brick mosaic occupies 10% of the image height. `brickPx = round(HALL_H × 0.10 / mosaic.height)` = `round(1302 × 0.10 / 32)` = **4 px/brick**. This is a global constant — all 6 slots use the same scale. `ALCOVE_H_PX` is no longer needed per slot; the formula replaces it.

---

## Decision 7: `?hall=` Pre-fill on Faceplate.me

**Decision**: On page load in `src/pages/index.astro`, read `new URLSearchParams(window.location.search).get('hall')`. If present and non-empty, set `groupNameInput.value` to that value. No validation — the user may edit before submitting.

**When triggered**: Clicking "Add your face to this gallery ↗" on any gallery page navigates to `https://faceplate.me/?hall={slug}`. The pre-fill makes the submission flow seamless.

---

## Decision 8: Submission Manifest Format

**Decision**: Append-only JSON array at `{GALLERY_DATA_DIR}/submissions.json`. Each record:

```json
{
  "uuid": "8f4a2...",
  "slug": "hall-of-faces",
  "timestamp": 1748966400000,
  "filename": "8f4a2....png"
}
```

On submission: append to the file (read → append → write). On gallery page render: filter by slug, sort by timestamp ascending, paginate into groups of 6 for the Hall.JPEG composites.

**Concurrency note**: For low-volume galleries, a single-file append strategy is sufficient. If concurrent submissions cause a write race, the last writer wins — acceptable for this use case. A database or file lock would be used if the volume grows significantly.
