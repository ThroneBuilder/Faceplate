# API Contracts: Phase 006 — Hall of Faces Gallery

---

## Page: `GET /{gallery-slug}` — Gallery Page

**Type**: Astro SSR page (`src/pages/[gallery].astro`, `prerender = false`)

**Description**: Server-renders the gallery page for a given slug. Reads gallery config and submission manifest on every request.

**Response**:
- `200 OK` + HTML if slug matches a configured gallery
- `404` with "Gallery not found" message if slug is unknown

**Rendered content** (see `contracts/ui-state.md` for layout):
- Page `<title>`: gallery `displayName`
- Header: displayName, description, "Add your face to this gallery" link
- One `<canvas>` per group of 6 submissions (plus one if no submissions)
- `<script>` with `window.GALLERY_BATCHES` = array of arrays of image URLs

---

## API: `GET /api/gallery-image/[slug]/[uuid].png` — Serve Submission Image

**Type**: Astro SSR API route (`src/pages/api/gallery-image/[slug]/[uuid].astro`, `prerender = false`)

**Description**: Streams a submitted PNG from `{GALLERY_DATA_DIR}/{slug}/{uuid}.png`.

**Path params**:
- `slug`: gallery slug (validated against config)
- `uuid`: submission UUID (must match filename)

**Responses**:
- `200 OK` + `Content-Type: image/png` + file stream
- `404` if file not found or slug invalid

---

## API: `POST /api/gallery/submit` — Submit Mosaic (updated from Phase 005)

**Type**: Astro SSR API route (existing, updated)

**Changes from Phase 005**:
- `redirectUrl` in success response changes from `/gallery/{slug}` to `/{slug}`
- Submission PNG written to `{GALLERY_DATA_DIR}/{slug}/{uuid}.png`
- Submission record appended to `{GALLERY_DATA_DIR}/submissions.json`
- Validates slug against the new `gallery-groups.json` schema (now includes `description` and `visibility`)

**Request** (unchanged): `multipart/form-data` — `group_name` (string) + `mosaic` (PNG ≤ 2 MB)

**Success response** (updated):
```json
{ "success": true, "redirectUrl": "/hall-of-faces" }
```

**Error responses** (unchanged): 400, 404, 413, 500 per Phase 005 spec.

---

## API: `GET /api/gallery-submissions/[slug]` — List Submissions (JSON)

**Type**: Astro SSR API route (`src/pages/api/gallery-submissions/[slug].ts`, `prerender = false`)

**Description**: Returns ordered submission records for a gallery. Used by the gallery page client-side script to build image URL arrays.

**Response** (`200 OK`):
```json
{
  "slug": "hall-of-faces",
  "submissions": [
    {
      "uuid": "8f4a2...",
      "timestamp": 1748966400000,
      "imageUrl": "/api/gallery-image/hall-of-faces/8f4a2....png"
    }
  ]
}
```

Submissions are sorted by `timestamp` ascending (earliest → first cubby).

**404** if slug not in config.

Note: This endpoint is optional — the SSR gallery page can embed the submission URLs directly in the rendered HTML instead of requiring a separate fetch. If the list is embedded in `window.GALLERY_BATCHES`, this endpoint is only needed for live-refresh scenarios.
