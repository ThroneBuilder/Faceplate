# Data Model: Phase 1A — Core LEGO Mosaic Generator

**Branch**: `001-lego-mosaic-core` | **Phase**: 1 (Design) | **Date**: 2026-05-30

All types live in `src/types/index.ts` unless noted. Types are designed to be forward-compatible with Phase 2 (BrickLink inventory) and Phase 3 (Studio export) via optional extension fields.

---

## Entity: LegoColor

The canonical definition of a LEGO 1×1 square plate color. Source of truth is `src/data/lego-palette.json`.

```ts
interface LegoColor {
  // Phase 1A fields (required)
  id: number;                        // LEGO official color ID
  name: string;                      // Human-readable color name (e.g., "Bright Red")
  rgb: [number, number, number];     // sRGB [R, G, B] each 0–255

  // Phase 2 extension fields (optional, omitted in Phase 1A data)
  brickLinkColorId?: number;         // BrickLink internal color ID
  brickLinkColorName?: string;       // BrickLink display name (may differ from LEGO name)
  available1x1Plate?: boolean;       // Whether 1x1 plate is available in this color

  // Phase 3 extension fields (optional)
  studioColorId?: number;            // BrickLink Studio color ID for .io export
  hexCode?: string;                  // Derived display helper: "#RRGGBB"
}
```

**Validation rules**:
- `id` is unique across the palette
- `rgb` values are integers in [0, 255]
- Phase 1A palette must contain at least 1 entry

**State transitions**: Static — no mutations at runtime. Palette is loaded once at module initialization.

---

## Entity: FaceImage

The raw file selected by the user before any cropping or processing.

```ts
interface FaceImage {
  file: File;                        // Native browser File object
  format: 'jpeg' | 'png';           // Validated MIME type
  widthPx: number;                   // Natural width in pixels
  heightPx: number;                  // Natural height in pixels
  fileSizeBytes: number;             // file.size
  objectUrl: string;                 // URL.createObjectURL(file) — revoke after crop confirm
}
```

**Validation rules**:
- `format` must be `'jpeg'` or `'png'`; all other MIME types → display error, block flow (FR-012)
- `fileSizeBytes` ≤ 10 MB (10,485,760 bytes); if exceeded → display size-limit error (spec assumption)
- `widthPx` and `heightPx` both ≥ 100 (spec edge case: warn if either dimension < 100)

---

## Entity: CropSelection

The square region chosen by the user via the crop tool. Produced after the user confirms the crop UI.

```ts
interface CropSelection {
  x: number;                         // Left edge in source image pixels
  y: number;                         // Top edge in source image pixels
  widthPx: number;                   // = heightPx (enforced square by crop tool)
  heightPx: number;                  // = widthPx
  imageData: ImageData;              // Resolved pixel data of the cropped square
}
```

**Validation rules**:
- `widthPx === heightPx` always (cropperjs `aspectRatio: 1` enforces this)
- `widthPx >= 100` and `heightPx >= 100`; if smaller → warn, disable Generate button (FR-002)

---

## Entity: AdjustedImage

The cropped image with brightness and contrast offsets applied. Produced live as sliders change.

```ts
interface AdjustedImage {
  source: CropSelection;             // Reference to the crop that produced this
  brightnessOffset: number;          // Integer, −128 to +128; default 0 (FR-004)
  contrastOffset: number;            // Integer, −128 to +128; default 0 (FR-004)
  imageData: ImageData;              // Pixel data after adjustment applied
}
```

**Validation rules**:
- `brightnessOffset` ∈ [−128, 128]
- `contrastOffset` ∈ [−128, 128]
- At default offsets (both 0), `imageData` is pixel-identical to `source.imageData`

---

## Entity: Mosaic

The 32×32 grid of LEGO color assignments. This is the primary output of the generation pipeline.

```ts
interface Mosaic {
  grid: number[][];                  // 32×32 array of LegoColor.id values
  width: 32;                         // Always 32 (Phase 1A fixed)
  height: 32;                        // Always 32 (Phase 1A fixed)

  // Traceability (supports regression testing and future extensibility)
  algorithmVersion: string;          // Semver string, e.g. "1.0.0"
  inputHash?: string;                // Optional: hash of input ImageData for determinism checks

  // Phase 2+ extension
  pieceType?: '1x1-plate';           // Fixed to '1x1-plate' in Phase 1A; extensible later
}
```

**Invariants**:
- `grid.length === 32` and `grid[i].length === 32` for all i
- Every `grid[i][j]` value exists as a `LegoColor.id` in the loaded palette
- Identical `AdjustedImage.imageData` → identical `Mosaic.grid` (FR-007 determinism)

**Derived quantities** (not stored, always computed from `grid`):
- `ColorMatrix` — map `grid[i][j]` to `LegoColor.name`
- `PartsList` — aggregate counts of each color ID

---

## Entity: ColorMatrix

Derived from `Mosaic`. A 32×32 grid of human-readable color identifiers for display.

```ts
interface ColorMatrix {
  cells: string[][];                 // 32×32 array of LegoColor.name values
}
```

**Derivation**: `cells[i][j] = palette.get(mosaic.grid[i][j]).name`

**Display note**: Short names preferred (e.g., "Bright Red" not "Bright Red [3024]"); controlled by `LegoColor.name`.

---

## Entity: PartsList

Derived from `Mosaic`. Aggregated per-color count for the parts shopping list.

```ts
interface PartsListEntry {
  colorId: number;                   // LegoColor.id
  colorName: string;                 // LegoColor.name
  count: number;                     // Number of 1×1 plates of this color needed
  rgbHex: string;                    // "#RRGGBB" — for swatch display

  // Phase 2 extension (BrickLink integration)
  brickLinkColorId?: number;
  brickLinkUrl?: string;             // Direct link to BrickLink purchase page

  // Phase 3 extension (Studio export)
  studioColorId?: number;
}

interface PartsList {
  entries: PartsListEntry[];         // Sorted descending by count
  totalPieces: number;               // Always === 1024 (FR-010 invariant)
}
```

**Invariants**:
- `entries.reduce((s, e) => s + e.count, 0) === 1024`
- No duplicate `colorId` values in `entries`
- Edge case: a uniform image produces exactly 1 entry with `count === 1024` (spec edge case)

---

## State Machine: UI Flow

The overall application moves through these states in sequence:

```
IDLE
  → (user selects file)
UPLOADING / VALIDATING
  → (validation fails)  IDLE + error displayed
  → (validation passes) CROPPING

CROPPING
  → (user confirms crop, crop ≥ 100×100) ADJUSTING
  → (crop < 100×100)    CROPPING + warning

ADJUSTING
  → (user clicks Generate) GENERATING
  → (user re-crops)      CROPPING  [mosaic cleared]

GENERATING
  → (success) RESULT_DISPLAYED
  → (error)   ADJUSTING + error displayed

RESULT_DISPLAYED
  → (user re-crops or uploads new image) CROPPING or IDLE  [mosaic cleared]
```

**Implementation note**: Represent as a discriminated union in TypeScript:

```ts
type AppState =
  | { phase: 'idle' }
  | { phase: 'cropping'; image: FaceImage }
  | { phase: 'adjusting'; crop: CropSelection; brightness: number; contrast: number }
  | { phase: 'generating'; adjusted: AdjustedImage }
  | { phase: 'result'; mosaic: Mosaic; adjusted: AdjustedImage }
```

---

## Static Data: LEGO Palette JSON Schema

File: `src/data/lego-palette.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["id", "name", "rgb"],
    "properties": {
      "id":   { "type": "integer" },
      "name": { "type": "string" },
      "rgb":  { "type": "array", "items": { "type": "integer", "minimum": 0, "maximum": 255 }, "minItems": 3, "maxItems": 3 },
      "brickLinkColorId":   { "type": "integer" },
      "brickLinkColorName": { "type": "string" },
      "available1x1Plate":  { "type": "boolean" },
      "studioColorId":      { "type": "integer" },
      "hexCode":            { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" }
    },
    "additionalProperties": false
  }
}
```

**Phase 1A**: Only `id`, `name`, and `rgb` fields populated. Optional fields present in schema but absent from data file — parsers ignore missing optional fields gracefully.
