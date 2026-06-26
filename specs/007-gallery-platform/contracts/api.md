# API Contracts: Gallery Platform Expansion (007)

All endpoints are SSR (`export const prerender = false`). All POST endpoints accept/return `application/json` unless noted.

---

## Modified Endpoints

### POST /api/gallery/submit

**Change**: Add `name` field to FormData. Save `{uuid}.json` instead of `{uuid}.csv`.

**Request** (multipart/form-data):
```
group_name: string          // gallery slug (must be a public gallery)
name: string                // submitter name (required, max 80 chars)
mosaic: File                // PNG image (max 2 MB)
mosaic_json: File           // JSON data file (MosaicDataFile format, max 256 KB)
```

**Response 200**:
```json
{ "success": true, "redirectUrl": "/{slug}" }
```

**Response 400** (validation failures):
```json
{ "success": false, "error": "Name is required" }
{ "success": false, "error": "Group name is required (max 64 characters)" }
{ "success": false, "error": "Gallery is not open for public submissions" }
```

**Response 413**: Image too large.
**Response 404**: Gallery not found.

---

### POST /api/gallery/delete *(unchanged interface)*

**Change**: Deletes `{uuid}.json` instead of `{uuid}.csv`.

**Request**:
```json
{ "uuid": "string", "slug": "string" }
```

**Response 200**: `{ "success": true }`

---

### POST /api/gallery/promote *(behavior update)*

**Change**: Update to support 3-state move logic (top-of-group → previous-group → bottom). Rename to `/api/gallery/reorder` internally, keep `/promote` as alias for backward compat.

**Request**:
```json
{ "uuid": "string", "slug": "string" }
```

**Response 200**: `{ "success": true, "action": "moved-to-top" | "moved-to-prev-group" | "moved-to-bottom" }`

---

## New Endpoints

### POST /api/gallery/move

Move one or more faces to a different gallery. Moves PNG + JSON files; updates both source and target manifests.

**Request**:
```json
{
  "uuids": ["uuid1", "uuid2"],
  "fromSlug": "hall-of-faces",
  "toSlug": "hall-of-nobles"
}
```

**Response 200**:
```json
{
  "success": true,
  "moved": 2,
  "failed": []
}
```

**Response 400**: Missing fields, same source/target slug, or target is not a valid gallery.

**Response 207** (partial success):
```json
{
  "success": false,
  "moved": 1,
  "failed": [{ "uuid": "uuid2", "reason": "File not found" }]
}
```

---

### GET /api/gallery/image/{slug}/{uuid}.json

Serve the structured data file for a given submission.

**Response 200**: `application/json` — `MosaicDataFile` body.
**Response 404**: Submission not found.

---

## Client-Side Contracts

### Plate Layout Module (`src/lib/mosaic/plate-layout.ts`)

```typescript
function computePlateLayout(
  mask: FaceMask,
  mosaicWidth: 32,
  mosaicHeight: BrickHeight
): PlateLayoutResult
```

Input: the face mask (defines which cells are within the face shape).
Output: `PlateLayoutResult` with `top`, `bottom`, and `plates` fields.
Pure function — no side effects.

### Random Name Generator

```typescript
function generateRandomName(): string
// Returns "{extreme-adj} {brick-adj} {noun}" e.g. "awesome brick champion"
```

Embedded wordlists, uses `Math.random()`.

### Gallery Nav Component (`src/components/GalleryNav.astro`)

Props:
```typescript
interface Props {
  currentSlug?: string   // highlights active gallery in nav
}
```

Reads gallery groups from `getGalleries()` server-side. Renders two labeled groups: "Public" and "Restricted". Highlights the current gallery if `currentSlug` matches.

### Admin Selection Store (inline script in [gallery].astro)

Not an API — client-side state in the gallery page.

Events:
- Checkbox click → add/remove uuid from `selected` Set
- "Select All" → add all visible uuids
- "Clear" → empty the Set
- Any bulk action → POST to appropriate endpoint, reload on success
