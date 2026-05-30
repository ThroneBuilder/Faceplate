# Research: Phase 1A — Core LEGO Mosaic Generator

**Branch**: `001-lego-mosaic-core` | **Phase**: 0 (Pre-Design Research) | **Date**: 2026-05-30

---

## 1. Image Crop Library

**Decision**: Use `cropperjs` v2

**Rationale**: MIT licensed, zero React/framework dependency — works in a plain Astro `<script>` block or island. TypeScript types are bundled in the v2 package (rewritten in TypeScript). Supports `aspectRatio: 1` for square-only crops, drag handles, and outputs a `<canvas>` element directly for pixel-level downstream access. Bundle is ~50 kB min+gz, acceptable for a one-time UI widget.

**Alternatives considered**:
- `react-image-crop` — disqualified, requires React as peer dep
- `pintura` — commercial/paid license, overkill for a single crop interaction
- `croppr.js` — abandoned (last commit ~2020)
- `cropperjs` v1 — valid fallback if v2 is still unstable at build time; add `@types/cropperjs` from DefinitelyTyped; API is nearly identical

**Action item**: Check [cropperjs GitHub releases](https://github.com/fengyuanchen/cropperjs) at project setup time to determine whether to use v2 or v1 stable.

---

## 2. Color Distance / LEGO Palette Matching

**Decision**: Use `culori`

**Rationale**: `differenceCie2000` is an accurate CIEDE2000 implementation. The `nearest(palette, differenceCie2000)` helper solves palette nearest-neighbor with no extra code. Bundled TypeScript types, ESM-native, fully tree-shakeable (only imported functions are bundled). Actively maintained as of mid-2025.

**Alternatives considered**:
- `color-diff` — has a convenient `diff.closest()` API but unmaintained (last release 2021); no bundled TS types
- `delta-e` — minimal and correct but no RGB→Lab conversion included and unmaintained
- `chroma-js` — larger bundle (~14 kB min+gz), no built-in palette search
- `colord` — small but CIEDE2000 requires a third-party plugin of variable quality

**Usage pattern**:
```ts
import { nearest, differenceCie2000, rgb } from 'culori'

// Pre-build finder once at module load (O(n) per call, n = palette size)
const findNearest = nearest(LEGO_PALETTE_LAB, differenceCie2000)

// Per-pixel call in pipeline
const closestColor = findNearest(pixelLabValue)
```

**Color space**: Convert sRGB → Oklab or CIELab internally; `culori` handles the conversion chain automatically when passing `rgb()` objects.

---

## 3. Image Downsampling (Average Pooling)

**Decision**: Use native Canvas 2D API with manual average pooling via `getImageData`

**Rationale**: The spec mandates CIEDE2000 distance after average pooling — these are two separate steps. The Canvas `drawImage` with `imageSmoothingQuality: 'high'` uses browser-vendor interpolation which is not deterministic across browsers and would violate FR-007. Instead:

1. Draw source image to a canvas at full resolution
2. Read `ImageData` for each 32×32 super-pixel block
3. Average R, G, B channels independently across all pixels in each block
4. Match resulting average color to LEGO palette

This approach is deterministic (pure arithmetic), works fully in-browser, and requires no extra dependency.

**Alternatives considered**:
- `drawImage` resize with `imageSmoothingQuality: 'high'` — browser-vendor-dependent, not deterministic
- WASM-based image processing (e.g., `@squoosh/lib`) — overkill, adds WASM bundle complexity

---

## 4. Brightness / Contrast Adjustment

**Decision**: Canvas 2D `getImageData` / `putImageData` with direct pixel manipulation

**Rationale**: Standard, well-understood approach. Deterministic. No dependency. Algorithm:

```
brightness: pixel_out = clamp(pixel_in + brightnessOffset, 0, 255)
contrast:   factor = (259 * (contrastOffset + 255)) / (255 * (259 - contrastOffset))
            pixel_out = clamp(factor * (pixel_in - 128) + 128, 0, 255)
```

Applied per channel (R, G, B), alpha unchanged.

---

## 5. Testing: Deterministic Pipeline Regression

**Decision**: Vitest + `canvas` npm package (Node.js Cairo bindings) + `toMatchFileSnapshot`

**Rationale**: Neither jsdom nor happy-dom implements `CanvasRenderingContext2D`. The `canvas` npm package provides real pixel operations in Node. Using `environment: 'node'` and instantiating `canvas` directly (rather than jsdom polyfill) is simpler and avoids DOM fragility.

`toMatchFileSnapshot` (Vitest 1.x+) writes golden output to an arbitrary `.json` file checked into source control — ideal for a 1,024-element numeric array where inline snapshots would be unreadable. Update deliberately with `--update-snapshots`.

**Setup**:
```ts
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
  },
})
```

**Fixture images**: Load via `canvas` package's `loadImage(path)` in test files. Two fixtures needed minimum:
- `tests/fixtures/test-face.jpg` — representative face photo for regression baseline
- `tests/fixtures/solid-white.png` — edge-case: all cells should map to the single nearest white LEGO color

**Web Workers**: Extract core pipeline logic into pure-function modules (no Worker globals). Test the functions directly in Vitest. The Worker wrapper is thin and tested separately if used.

---

## 6. Astro Architecture for Client-Side Processing

**Decision**: Astro with a single interactive island using vanilla TypeScript modules

**Rationale**: The spec requires no SSR data, no server, and all processing in-browser. The app is effectively a single-page tool. Use one Astro page (`index.astro`) with a `<script>` tag importing a TypeScript module that manages UI state and wires up the pipeline. No React/Vue/Svelte required — the DOM manipulation is simple enough for vanilla TS.

If component complexity grows in future phases, migrate the island to a framework component at that point. Don't pre-optimize.

**Astro config**: `output: 'static'` (no SSR server needed). TypeScript via `@astrojs/ts-plugin`.

---

## 7. LEGO Color Palette Data

**Decision**: Static `lego-palette.json` bundled with the app, sourced manually from reference data (lego-art-remix project and BrickLink color database)

**Rationale**: Per spec assumption, palette does not change without a code update. No runtime fetch. The JSON schema is designed to be extensible for Phase 2 (BrickLink integration) and Phase 3 (Studio export) — see `data-model.md`.

**Scope for Phase 1A**: Include only colors available for LEGO 1×1 square plates. Fields needed: `id`, `name`, `rgb`. Pre-compute `lab` values at build time or module-load time using `culori`.

---

## 8. Unresolved / Deferred

| Item | Status |
|---|---|
| Exact list of LEGO 1×1 plate colors | Deferred to implementation — source from lego-art-remix repo and cross-reference BrickLink |
| File size limit enforcement (10 MB) | Resolved in spec (FR-012 + assumption); implement via `File.size` check before processing |
| cropperjs v1 vs v2 stability decision | Deferred to project setup time; pin whichever is stable |
| Performance validation (<10s SC-002) | Deferred to testing phase; pure canvas operations on a 32×32 target should be well under 1s |
