# Quickstart: Phase 1A — Core LEGO Mosaic Generator

**Branch**: `001-lego-mosaic-core` | **Date**: 2026-05-30

---

## Prerequisites

- Node.js 20+ (LTS)
- pnpm 9+ (or npm/yarn, but pnpm assumed in commands below)

---

## Project Setup

```bash
# From repo root — Astro project lives at root
pnpm create astro@latest . --template minimal --typescript strict --no-install
pnpm install

# Core runtime dependencies
pnpm add cropperjs culori

# Dev dependencies
pnpm add -D vitest canvas @types/canvas jsdom @vitest/coverage-v8
```

**Verify cropperjs version** before installing: check [github.com/fengyuanchen/cropperjs/releases](https://github.com/fengyuanchen/cropperjs) — use `cropperjs@^2` if v2 is stable, otherwise `cropperjs@^1` + `pnpm add -D @types/cropperjs`.

---

## Project Structure

```
Faceplate/
├── src/
│   ├── pages/
│   │   └── index.astro           # Single page — upload → crop → adjust → generate → result
│   ├── components/               # Astro components (markup + minimal wiring)
│   │   ├── UploadArea.astro
│   │   ├── CropTool.astro
│   │   ├── AdjustmentPanel.astro
│   │   ├── MosaicDisplay.astro
│   │   ├── ColorMatrix.astro
│   │   └── PartsList.astro
│   ├── lib/
│   │   ├── app-state.ts          # UI state machine (discriminated union + transitions)
│   │   ├── mosaic/
│   │   │   ├── pipeline.ts       # generateMosaic() — main entry point
│   │   │   ├── downsample.ts     # downsampleToGrid() — average pooling
│   │   │   ├── color-match.ts    # matchColors() — CIEDE2000 via culori
│   │   │   └── parts-list.ts     # derivePartsList()
│   │   └── image/
│   │       ├── adjust.ts         # applyAdjustments() — brightness/contrast
│   │       └── validate.ts       # File type + size validation
│   ├── data/
│   │   └── lego-palette.json     # Static LEGO color palette (id, name, rgb)
│   └── types/
│       └── index.ts              # LegoColor, FaceImage, CropSelection, Mosaic, etc.
├── tests/
│   ├── unit/
│   │   ├── downsample.test.ts
│   │   ├── color-match.test.ts
│   │   ├── adjust.test.ts
│   │   └── parts-list.test.ts
│   ├── regression/
│   │   ├── mosaic-pipeline.test.ts
│   │   └── __snapshots__/
│   │       └── mosaic-32x32.snap.json   # Golden output — commit this file
│   └── fixtures/
│       ├── test-face.jpg         # Representative face photo for baseline regression
│       └── solid-white.png       # Edge-case fixture: should produce 1-entry parts list
├── vitest.config.ts
└── astro.config.mjs
```

---

## Astro Config

```ts
// astro.config.mjs
import { defineConfig } from 'astro/config'

export default defineConfig({
  output: 'static',    // No server needed; pure client-side app
})
```

---

## Vitest Config

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',   // Use 'canvas' npm package directly — no jsdom fragility
    globals: true,
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**'],
    },
  },
})
```

---

## Dev Server

```bash
pnpm dev         # Starts Astro dev server at http://localhost:4321
pnpm build       # Static build output to dist/
pnpm preview     # Serve static build locally
```

---

## Running Tests

```bash
pnpm test              # Run all tests
pnpm test --run        # Single-pass (CI mode)
pnpm test --coverage   # Coverage report

# Update regression snapshots after intentional algorithm change
pnpm test --update-snapshots
```

---

## Implementation Order

Follow the dependency chain from bottom up:

1. `src/types/index.ts` — define all types first
2. `src/data/lego-palette.json` — populate Phase 1A colors (source from lego-art-remix)
3. `src/lib/image/validate.ts` + tests
4. `src/lib/image/adjust.ts` + tests
5. `src/lib/mosaic/downsample.ts` + tests
6. `src/lib/mosaic/color-match.ts` + tests
7. `src/lib/mosaic/parts-list.ts` + tests
8. `src/lib/mosaic/pipeline.ts` + regression tests (commit snapshot)
9. `src/lib/app-state.ts` + state machine tests
10. Astro components — wire UI to lib functions
11. `src/pages/index.astro` — compose components, attach event handlers

---

## Key Design Decisions (see research.md for rationale)

| Decision | Choice |
|---|---|
| Crop tool | `cropperjs` v2 (v1 fallback if v2 not yet stable) |
| Color distance | `culori` — `differenceCie2000` + `nearest()` |
| Downsampling | Manual average pooling via Canvas `getImageData` |
| Testing | Vitest + `canvas` npm, `toMatchFileSnapshot` for regression |
| Framework | Astro static, vanilla TypeScript islands |
| Processing | Client-side only — no server, no external runtime fetches |
