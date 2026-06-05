# Data Model: Phase 005 — Save, Share, and Export

## New Types

### SessionMetadata

Stored as JSON in IndexedDB alongside the image Blob. Contains all non-binary session state.

```typescript
export interface SessionMetadata {
  version: 1                          // schema version for future migrations
  savedAt: number                     // Date.now() at last save
  // Crop step
  cropParams: {
    topY: number; bottomY: number
    leftX: number; rightX: number
    cropWidthPx: number; cropHeightPx: number
    brickHeight: BrickHeight
  }
  // Candidate grid center & tuning
  candidateKey: { brightnessOffset: number; contrastOffset: number }
  distance: number                    // last-used Neighbors distance value
  // Confirmed mosaic
  mosaicGrid: number[][]             // mosaic.grid (colorId per cell)
  mosaicWidth: number                // = 32
  mosaicHeight: BrickHeight
  // Face mask
  maskRows: Array<{ leftCol: number; rightCol: number }>
}
```

### PersistedSession

The full IndexedDB record, stored under key `"faceplate-session"` in database `"faceplate"`, object store `"sessions"`.

```typescript
export interface PersistedSession {
  metadata: SessionMetadata
  imageBlob: Blob                    // EXIF-corrected crop image as PNG Blob
}
```

**Expiry**: `metadata.savedAt + 30_days_ms`. Checked on page load; expired records are deleted.

---

### DownloadPackage (runtime, not persisted)

Assembled on demand when the user presses "Download". Never stored.

```typescript
// Conceptual — not a runtime type, just the set of files in the ZIP
{
  'face-mosaic.png': Blob    // Canvas 2D PNG, 10 px/brick, transparent background
  'original-image.jpg': Blob // EXIF-corrected cropped image
  'bricklink-wanted.xml': string
  'studio-model.ldr': string
  'readme.md': string
}
```

---

### GallerySubmission (API payload)

Sent as `multipart/form-data` to `POST /api/gallery/submit`.

```typescript
// FormData fields:
// group_name: string (max 64 chars, must match an admin-created group)
// mosaic: Blob (PNG, face-mosaic.png equivalent)
```

### GalleryResponse (API response)

```typescript
export interface GalleryResponse {
  success: true
  redirectUrl: string                // e.g. "https://faceplate.me/gallery/my-group"
}
// or on failure:
export interface GalleryErrorResponse {
  success: false
  error: string                      // human-readable message
}
```

---

## Existing Types — No Breaking Changes

| Type | Change |
|---|---|
| `AppState` | No change — session serialisation reads from app state; does not modify it |
| `Mosaic` | No change — `mosaicGrid` in `SessionMetadata` is a plain copy of `mosaic.grid` |
| `FaceMask` | No change — `maskRows` in `SessionMetadata` is a plain copy of `mask.rows` |
| `LegoColor` | No change — `brickLinkColorId` and `studioColorId` fields already exist |
| `HeadCropSelection` | No change — `cropParams` in `SessionMetadata` copies the relevant fields |

---

## State Transitions for Session Persistence

| Event | Session Save Trigger |
|---|---|
| Confirm Crop pressed | Save after `onCropConfirmed` resolves |
| Confirm Mosaic pressed | Save after `onFaceShapingStart` resolves |
| Mask cell clicked/dragged | Save after `onMaskCellClicked` resolves (debounced 1 s) |

Session is cleared (IndexedDB record deleted) when:
- User selects a new image (new upload or camera capture)
- Session record is found to be older than 30 days on page load

---

## Gallery Groups (server-side config, not a runtime type)

```json
// gallery-groups.json (deployed with server)
{
  "groups": [
    { "slug": "my-group", "displayName": "My Group" }
  ]
}
```

Admin creates a group by adding an entry to this file and redeploying. Group slugs are URL-safe lowercase strings (a–z, 0–9, hyphens). Submitted mosaics are stored at `public/gallery/{slug}/{uuid}.png`.
