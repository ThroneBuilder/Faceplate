# Data Model: Phase 006 — Hall of Faces Gallery Pages

## Updated Types

### GalleryGroup (extends Phase 005)

```typescript
export interface GalleryGroup {
  slug: string          // URL-safe slug, e.g. "hall-of-faces"
  displayName: string   // Page title, e.g. "Hall of Faces"
  description: string   // Subtitle shown under the gallery title
  visibility: 'public' | 'unlisted'
}
```

`gallery-groups.json` is updated to this schema. `visibility: 'unlisted'` means no page on the site links to this gallery.

---

### SubmissionRecord (server-side, stored in submissions.json)

```typescript
export interface SubmissionRecord {
  uuid: string        // UUID v4, unique across all galleries
  slug: string        // gallery slug this submission belongs to
  timestamp: number   // Date.now() at submission time
  filename: string    // "{uuid}.png"
}
```

Stored as a JSON array at `{GALLERY_DATA_DIR}/submissions.json`.  
PNG files stored at `{GALLERY_DATA_DIR}/{slug}/{uuid}.png`.

---

### CubbySlot (calibration constants, module-level constants)

```typescript
export interface CubbySlot {
  row: 0 | 1         // 0 = top row, 1 = bottom row
  col: 0 | 1 | 2     // 0 = left, 1 = center, 2 = right
  alcoveCx: number   // horizontal centre of dark alcove (Hall.JPEG canvas px)
  alcoveCy: number   // vertical centre of dark alcove (Hall.JPEG canvas px)
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

// Scale: 32-brick mosaic = 10% of HALL_H.  brickPx = round(HALL_H × 0.10 / mosaicHeight)
export const HALL_MOSAIC_SCALE = 0.10
// For a 32-brick mosaic: round(1302 × 0.10 / 32) = 4 px/brick
```

---

### Hall.JPEG Image Constants

```typescript
export const HALL_W = 1923   // Hall.JPEG native width
export const HALL_H = 1302   // Hall.JPEG native height
```

---

## AppState — No Changes

No changes to `AppState` in `src/types/index.ts`. The gallery feature is entirely server-side (SSR pages + API routes) and a small client-side canvas compositing script. It does not interact with the face-shaping state machine.

---

## Gallery Configuration (gallery-groups.json)

The three production galleries replace the Phase 005 test entry:

```json
{
  "groups": [
    {
      "slug": "hall-of-faces",
      "displayName": "Hall of Faces",
      "description": "[Replace with administrator-provided description]",
      "visibility": "public"
    },
    {
      "slug": "hall-of-nobles",
      "displayName": "Hall of Nobles",
      "description": "[Replace with administrator-provided description]",
      "visibility": "unlisted"
    },
    {
      "slug": "brickcon-2026",
      "displayName": "BrickCon 2026",
      "description": "[Replace with administrator-provided description]",
      "visibility": "public"
    }
  ]
}
```

---

## Persistent Storage Layout

```
{GALLERY_DATA_DIR}/            (default: /data/gallery in production; gallery-data/ locally)
├── submissions.json           ← append-only submission manifest (array of SubmissionRecord)
├── hall-of-faces/
│   ├── {uuid-1}.png
│   ├── {uuid-2}.png
│   └── ...
├── hall-of-nobles/
│   └── ...
└── brickcon-2026/
    └── ...
```

Environment variable `GALLERY_DATA_DIR` controls the root path. `src/pages/api/gallery/submit.ts` and `src/pages/[gallery].astro` both read this variable.
