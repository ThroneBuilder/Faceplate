# UI State Contracts: Phase 004 — Face Shaping

## AppState Transitions

### `onFaceShapingStart`

```typescript
export function onFaceShapingStart(
  state: Extract<AppState, { phase: 'mosaic-confirmed' }>,
): Extract<AppState, { phase: 'face-shaping' }>
```

- Calls `buildInitialMask(state.mosaic.width, state.mosaic.height)` to seed the mask.
- Returns `{ phase: 'face-shaping', crop: state.crop, mosaic: state.mosaic, mask, key: state.key }`.
- Called in `index.astro` after the `mosaic-confirmed` → face-shaping render triggers (immediately, no user action required).

### `onMaskCellClicked`

```typescript
export function onMaskCellClicked(
  state: Extract<AppState, { phase: 'face-shaping' }>,
  row: number,
  col: number,
): Extract<AppState, { phase: 'face-shaping' }>
```

- Calls `toggleMaskCell(state.mask, row, col)`.
- Returns `{ ...state, mask: newMask }`.
- `row` and `col` are zero-indexed mosaic cell coordinates derived from the click position in the mask editor grid.

---

## UI Rendering Rules

### Phase: `face-shaping`

```
show(faceShapingSectionEl)
hide(candidateSectionEl)
hide(resultRowEl)
hide(adjustmentPanel)
```

Heading `"Shape your face"` is always shown when phase is `face-shaping`.

### Mask editor grid (`src/components/MosaicMaskEditor.astro`)

- Renders mosaic as a `display: grid` with `mosaic.width` columns × `mosaic.height` rows.
- Each cell `div` has `data-row` and `data-col` attributes.
- Visible cells: full brick colour as `background`.
- Masked cells: brick colour at 50% opacity via `opacity: 0.5` or `rgba` background.
- Click events delegated to the grid container; derive `(row, col)` from `dataset.row / dataset.col`.
- No hover state change needed (the click-toggle is the primary interaction).

### Cubby projection canvas (`#cubby-canvas`)

- `<canvas>` element with `width` and `height` set to Cubby.JPEG native resolution (`1682 × 1457`).
- CSS `width: 100%` or a fixed display size; canvas internal resolution stays native for sharpness.
- Redrawn via `renderCubbyProjection(ctx, cubbyImg, mosaic, mask, palette)` after every mask change.
- Cubby image loaded once on page load (`loadCubbyImage()`), cached in module scope.

---

## Component Tree

```
FaceShapingSection (src/components/FaceShapingSection.astro)
├── h2 "Shape your face"
├── div.face-shaping-panels
│   ├── div.panel.panel--editor
│   │   └── MosaicMaskEditor  (src/components/MosaicMaskEditor.astro)
│   │       └── div#mask-editor-grid
│   └── div.panel.panel--cubby
│       └── canvas#cubby-canvas
└── (no buttons — terminal step)
```

---

## Index.astro Integration Points

### New DOM references
```typescript
const faceShapingSectionEl = document.getElementById('face-shaping-section')!
const maskEditorGridEl     = document.getElementById('mask-editor-grid')!
const cubbyCanvasEl        = document.getElementById('cubby-canvas') as HTMLCanvasElement
```

### New imports
```typescript
import { onFaceShapingStart, onMaskCellClicked } from '../lib/app-state.js'
import { renderCubbyProjection, loadCubbyImage } from '../lib/face-shaping/cubby-render.js'
```

### renderPhase additions

```typescript
case 'mosaic-confirmed':
  // Immediately auto-transition to face-shaping (no user action needed)
  appState = onFaceShapingStart(state as Extract<AppState, { phase: 'mosaic-confirmed' }>)
  renderPhase(appState)
  return

case 'face-shaping':
  show(faceShapingSectionEl)
  renderMaskEditor((appState as FaceShapingState).mosaic, (appState as FaceShapingState).mask)
  renderCubbyProjection(cubbyCtx, cubbyImage, (appState as FaceShapingState).mosaic,
                        (appState as FaceShapingState).mask, palette)
  break
```

### Mask editor click handler

```typescript
maskEditorGridEl.addEventListener('click', (e) => {
  if (appState.phase !== 'face-shaping') return
  const cellEl = (e.target as Element).closest('[data-row]') as HTMLElement | null
  if (!cellEl) return
  const row = Number(cellEl.dataset.row)
  const col = Number(cellEl.dataset.col)
  appState = onMaskCellClicked(appState as FaceShapingState, row, col)
  renderMaskEditor(appState.mosaic, appState.mask)
  renderCubbyProjection(cubbyCtx, cubbyImage, appState.mosaic, appState.mask, palette)
})
```

### resetDownstream addition

Add `hide(faceShapingSectionEl)` alongside existing hide calls.
