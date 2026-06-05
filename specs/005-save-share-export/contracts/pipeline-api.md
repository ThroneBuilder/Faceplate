# Pipeline API Contracts: Phase 005 — Save, Share, and Export

All client-side modules below are pure functions (no DOM, no side effects) and testable in Vitest node environment, except where noted.

---

## Module: `src/lib/session/session-state.ts`

```typescript
import type { SessionMetadata, PersistedSession } from '../../types/index.js'

const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000  // 30 days

/**
 * Serialises the current app state into SessionMetadata.
 * Pure function — no side effects.
 */
export function serialiseSession(
  cropParams: SessionMetadata['cropParams'],
  candidateKey: SessionMetadata['candidateKey'],
  distance: number,
  mosaicGrid: number[][],
  mosaicWidth: number,
  mosaicHeight: BrickHeight,
  maskRows: SessionMetadata['maskRows'],
): SessionMetadata

/**
 * Saves a PersistedSession to IndexedDB.
 * Overwrites any existing record under key "faceplate-session".
 * Returns a promise; resolves on success, rejects on storage failure.
 */
export function saveSession(session: PersistedSession): Promise<void>

/**
 * Loads the PersistedSession from IndexedDB.
 * Returns null if no session exists or if the session has expired (> 30 days old).
 * Deletes the IndexedDB record if expired.
 */
export function loadSession(): Promise<PersistedSession | null>

/**
 * Deletes the persisted session from IndexedDB.
 * Called when the user starts a new image workflow.
 */
export function clearSession(): Promise<void>

/**
 * Returns true if the given SessionMetadata has expired.
 * Pure function — no side effects.
 */
export function isExpired(metadata: SessionMetadata): boolean
```

### Unit test surface (`tests/unit/session-state.test.ts`)

| Test | Description |
|---|---|
| `serialiseSession` | Correct fields populated from inputs |
| `isExpired` fresh | Returns false for savedAt = now |
| `isExpired` expired | Returns true for savedAt > 30 days ago |
| `isExpired` boundary | Exactly 30 days: returns true |

---

## Module: `src/lib/export/face-mosaic-png.ts`

Requires Canvas 2D (browser env). Not testable in Vitest node env; validated visually.

```typescript
import type { Mosaic, FaceMask, LegoColor } from '../../types/index.js'

/**
 * Renders the masked mosaic as a PNG Blob.
 * - Canvas size: mosaic.width × 10px  by  mosaic.height × 10px
 * - Masked cells: transparent (no fill)
 * - Visible cells: solid brick colour fill
 * Returns a Promise<Blob> resolving to a PNG image.
 */
export function renderFaceMosaicPng(
  mosaic: Mosaic,
  mask: FaceMask,
  palette: LegoColor[],
  brickPx?: number,   // default 10
): Promise<Blob>
```

---

## Module: `src/lib/export/bricklink-xml.ts`

```typescript
import type { Mosaic, LegoColor } from '../../types/index.js'

/**
 * Generates a BrickLink Wanted List XML string for the visible (unmasked) cells.
 * Groups by colour, sums quantities.
 * Omits colours whose brickLinkColorId is null/undefined.
 * Returns { xml: string; omittedColours: string[] }
 * where omittedColours lists colour names that were excluded.
 */
export function generateBrickLinkXml(
  mosaic: Mosaic,
  mask: FaceMask,
  palette: LegoColor[],
): { xml: string; omittedColours: string[] }
```

### Unit test surface (`tests/unit/bricklink-xml.test.ts`)

| Test | Description |
|---|---|
| Single colour | One `<ITEM>` with correct count and colorId |
| Multiple colours | One `<ITEM>` per colour; counts correct |
| Masked cells excluded | Masked bricks not included in counts |
| Missing brickLinkColorId | Colour omitted from XML; appears in omittedColours |
| Valid XML | Output parses as well-formed XML |

---

## Module: `src/lib/export/studio-ldr.ts`

```typescript
import type { Mosaic, FaceMask, LegoColor } from '../../types/index.js'

/**
 * Generates an LDraw-format LDR file string for visible mosaic cells.
 * Each visible cell → one line: 1 {studioColorId} {x} 0 {z} 1 0 0 0 1 0 0 0 1 3024.dat
 * x = col × 20, z = row × 20 (LDraw units)
 * Colours lacking studioColorId use colour 16 (placeholder).
 * Returns { ldr: string; placeholderColours: string[] }
 */
export function generateStudioLdr(
  mosaic: Mosaic,
  mask: FaceMask,
  palette: LegoColor[],
): { ldr: string; placeholderColours: string[] }
```

### Unit test surface (`tests/unit/studio-ldr.test.ts`)

| Test | Description |
|---|---|
| Single brick | Correct LDR line with right x/z coords |
| Masked cells omitted | Masked bricks produce no LDR lines |
| Coordinate mapping | Row 2, col 3 → x=60, z=40 |
| Missing studioColorId | Falls back to colour 16; listed in placeholderColours |

---

## Module: `src/lib/export/download-zip.ts`

Requires JSZip (browser env). Not testable in Vitest node env.

```typescript
import type { Mosaic, FaceMask, LegoColor } from '../../types/index.js'

/**
 * Assembles and triggers download of the results ZIP.
 * Internally calls renderFaceMosaicPng, generateBrickLinkXml, generateStudioLdr.
 * The filename is 'faceplate-results.zip'.
 * originalImageBlob is the EXIF-corrected cropped image from the session.
 */
export async function downloadResultsZip(
  mosaic: Mosaic,
  mask: FaceMask,
  palette: LegoColor[],
  originalImageBlob: Blob,
): Promise<void>
```

---

## Gallery Server Endpoint

### `POST /api/gallery/submit`

**Request**: `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `group_name` | string | Must match a slug in `gallery-groups.json`; max 64 chars |
| `mosaic` | File (PNG) | Masked mosaic image; max 2 MB |

**Success response** (HTTP 200):
```json
{ "success": true, "redirectUrl": "/gallery/my-group" }
```

**Error responses**:

| HTTP | Condition | Error message |
|---|---|---|
| 400 | `group_name` empty or > 64 chars | "Group name is required (max 64 characters)" |
| 404 | `group_name` not in group list | "Group not found — check the group name and try again" |
| 413 | `mosaic` file > 2 MB | "Image too large" |
| 500 | Write failure | "Server error — please try again" |

**Storage**: PNG written to `public/gallery/{group_slug}/{uuid}.png` on the server. UUID generated server-side.

**No authentication required** for submission (groups are pre-created by admin; the group name itself acts as the gate).
