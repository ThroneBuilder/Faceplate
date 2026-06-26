# Data Model: Gallery Platform Expansion (007)

## Existing Entities (Modified)

### GalleryGroup *(src/lib/gallery/config.ts)*

No interface changes — `visibility: 'public' | 'unlisted'` already captures the distinction.

**New data in gallery-groups.json** (add 2 galleries, update descriptions):

| slug | displayName | description | visibility |
|---|---|---|---|
| hall-of-faces | Hall of Faces | open sharing of face mosaics | public |
| brickcon-2026 | BrickCon 2026 | crowd participation at Lego event | public |
| hall-of-nobles | Hall of Nobles | Jeff's friends and family | unlisted |
| game-of-thrones | Game of Thrones | Game of Thrones characters | unlisted |
| seattle-faces | Seattle Faces | Seattle celebrities | unlisted |
| hall-of-presidents | Hall of Presidents | recent US presidents | unlisted |

**New helper** in config.ts:
```typescript
export function getPublicGalleries(): GalleryGroup[]   // visibility === 'public'
export function getRestrictedGalleries(): GalleryGroup[] // visibility === 'unlisted'
```

---

### SubmissionRecord *(src/lib/gallery/submissions.ts)*

Add `name` field. Backward-compatible (existing records without `name` default to `''`).

```typescript
export interface SubmissionRecord {
  uuid: string
  slug: string
  timestamp: number
  filename: string
  name: string          // NEW — submitter-provided display name
}
```

**New submission operations** (additions to submissions.ts):
- `moveSubmission(dataDir, uuid, fromSlug, toSlug, name)` — updates manifest entry slug; caller moves files
- `moveSubmissions(dataDir, uuids, fromSlug, toSlug)` — batch version

---

## New Entities

### PlateCell *(src/types/index.ts)*

```typescript
export interface PlateCell {
  plateId: number   // 1-indexed into PlateLayoutResult.plates; 0 = masked/empty
}
```

### PlateSpec *(src/types/index.ts)*

```typescript
export interface PlateSpec {
  id: number        // 1-indexed
  width: number     // studs wide
  height: number    // studs tall
}
```

### PlateLayoutResult *(src/types/index.ts)*

Returned by the backing plate algorithm. Covers the full mosaic grid (32 × BrickHeight).

```typescript
export interface PlateLayoutResult {
  top: number[][]     // [row][col] → plateId (0 = masked)
  bottom: number[][]  // [row][col] → plateId (0 = masked)
  plates: PlateSpec[] // index i → plates[i] (0-indexed; plate IDs in grids are 1-indexed)
}
```

---

### MosaicDataFile *(JSON format saved as {uuid}.json)*

This is the serialized format of the shareable data file, not a TypeScript interface in the runtime. The submission API serializes it at share time.

```typescript
interface MosaicDataFile {
  name: string             // submitter name
  date: string             // ISO 8601 UTC
  size: number             // mosaic height (26–36, always 32 width)
  brightness: number       // brightnessOffset used at generation
  contrast: number         // contrastOffset used at generation
  mosaic: number[][]       // [row][col] LEGO color ID; 0 = masked
  top: number[][]          // [row][col] plate index (1-indexed); 0 = masked
  bottom: number[][]       // [row][col] plate index (1-indexed); 0 = masked
  plates: Array<{ id: number; width: number; height: number }>
  parts: Array<{
    name: string           // color name
    partNumber: string     // BrickLink part number for 1×1 plate
    color: string          // hex color code
    count: number
  }>
}
```

---

### BulkSelection *(client-side only, no server persistence)*

Transient in-memory set in the admin gallery page. No server-side entity needed.

```typescript
// In gallery page inline script
const selected = new Set<string>()  // Set of uuids
```

---

## Validation Rules

| Field | Rule |
|---|---|
| `SubmissionRecord.name` | Non-empty after whitespace trim; max 80 characters |
| `MosaicDataFile.size` | Integer in {26, 28, 30, 32, 34, 36} |
| `MosaicDataFile.brightness` | Integer in [−100, 100] |
| `MosaicDataFile.contrast` | Integer in [−100, 100] |
| `PlateSpec.width`, `.height` | Positive integers from piece set: {1,2,3,4,6,8} |
| Gallery `toSlug` on move | Must match an existing GalleryGroup slug |

---

## State Transitions

### Submission lifecycle

```
[Created] → (admin moves) → [Moved to new gallery]
           → (admin promotes) → [Reordered within gallery]
           → (admin deletes) → [Deleted]
```

### Admin selection state (client)

```
[Unselected] ←→ [Selected]
                    ↓ bulk action chosen
                 [Action applied] → [Unselected] (after page reload)
```

### Move button states (per face)

```
[Normal: "Move to top"]          → click → moves to top of current group
[AtGroupTop: "Move to prev group"] → click → moves to top of previous group  
[AtAbsoluteTop: "Move to bottom"] → click → moves to absolute last position
```
