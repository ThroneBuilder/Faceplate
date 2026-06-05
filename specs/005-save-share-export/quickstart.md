# Quickstart / Integration Scenarios: Phase 005 — Save, Share, and Export

## Scenario 1: Session Auto-Save and Restore

**Flow**:
1. User uploads photo, completes crop → `saveSession(...)` called after `onCropConfirmed`
2. User confirms mosaic → `saveSession(...)` called after `onFaceShapingStart`
3. User adjusts mask → `saveSession(...)` called after each drag (debounced 1 s)
4. User closes browser tab and returns tomorrow
5. Page loads → `loadSession()` called on init
6. If session found and not expired → app reconstructs state → `renderPhase` renders face-shaping step with stored mosaic and mask
7. User sees their work exactly as they left it

**Validation**: Check that `metadata.savedAt` is present and within 30 days. If expired, `clearSession()` and start fresh.

---

## Scenario 2: Download ZIP

**Given**: User is at the face-shaping step with a confirmed mosaic and mask.

**Flow**:
1. User presses "Download"
2. `downloadResultsZip(mosaic, mask, palette, originalImageBlob)` called
3. Internally: `renderFaceMosaicPng` → PNG Blob
4. `generateBrickLinkXml` → XML string
5. `generateStudioLdr` → LDR string
6. `readme.md` content generated from template
7. All files added to JSZip instance
8. `zip.generateAsync({ type: 'blob' })` → ZIP Blob
9. `URL.createObjectURL(blob)` + `<a download>` click → browser download dialog

**Expected ZIP contents**:
```
faceplate-results.zip
├── face-mosaic.png          (masked mosaic, transparent background)
├── original-image.jpg       (EXIF-corrected crop)
├── bricklink-wanted.xml     (BrickLink import-ready)
├── studio-model.ldr         (LDraw-compatible)
└── readme.md                (file descriptions + link)
```

**Edge case**: If any generator fails, that file is omitted. The readme notes the omission.

---

## Scenario 3: Gallery Submission

**Given**: User is at face-shaping step. Group "my-family" was pre-created by admin.

**Flow**:
1. User types "my-family" in the "Add to Group" text field
2. User presses "Add to Group"
3. `renderFaceMosaicPng(mosaic, mask, palette)` → PNG Blob
4. `FormData` built: `group_name = "my-family"`, `mosaic = pngBlob`
5. `fetch('/api/gallery/submit', { method: 'POST', body: formData })`
6. Server validates group name → found → writes PNG → returns `{ success: true, redirectUrl: "/gallery/my-family" }`
7. Browser redirects to `/gallery/my-family`

**Failure path**: Server returns `{ success: false, error: "Group not found..." }` → inline error shown, no redirect.

---

## Scenario 4: New Image Clears Session

**Given**: User has a saved session from a previous visit.

**Flow**:
1. User returns, session restores to face-shaping step
2. User uploads a new photo (or uses camera)
3. `resetDownstream()` called → also calls `clearSession()`
4. IndexedDB record deleted
5. App starts fresh from upload step
6. When user confirms crop on new photo, a new session is saved

---

## Scenario 5: Session Expiry

**Given**: User saved a session 31 days ago.

**Flow**:
1. Page loads → `loadSession()` called
2. `isExpired(metadata)` → true (31 days > 30 days)
3. `clearSession()` → IndexedDB record deleted
4. `loadSession()` returns `null`
5. App starts from idle/upload state

---

## Unit Test Scenarios

### `serialiseSession`
```typescript
const meta = serialiseSession(
  { topY: 0, bottomY: 400, leftX: 0, rightX: 300, cropWidthPx: 300, cropHeightPx: 400, brickHeight: 32 },
  { brightnessOffset: 10, contrastOffset: -5 },
  16,
  mosaicGrid,
  32, 32,
  maskRows,
)
expect(meta.version).toBe(1)
expect(meta.candidateKey).toEqual({ brightnessOffset: 10, contrastOffset: -5 })
expect(meta.distance).toBe(16)
expect(typeof meta.savedAt).toBe('number')
```

### `isExpired`
```typescript
const fresh = { ...meta, savedAt: Date.now() }
expect(isExpired(fresh)).toBe(false)

const old = { ...meta, savedAt: Date.now() - 31 * 24 * 60 * 60 * 1000 }
expect(isExpired(old)).toBe(true)
```

### `generateBrickLinkXml` — masked cells excluded
```typescript
// 2×2 mosaic, mask hides right column
const mask: FaceMask = { rows: [
  { leftCol: 0, rightCol: 0 },
  { leftCol: 0, rightCol: 0 },
], mosaicWidth: 2 }
const { xml } = generateBrickLinkXml(mosaic2x2, mask, palette)
// Only 2 visible bricks (left column), not 4
expect(xml).toContain('<MINQTY>2</MINQTY>')  // assuming both left cells same colour
```

### `generateStudioLdr` — coordinate mapping
```typescript
// Row 2, col 3 → x=60, z=40
const { ldr } = generateStudioLdr(mosaic, fullMask, palette)
expect(ldr).toContain('60 0 40')  // part of the coordinate line
```
