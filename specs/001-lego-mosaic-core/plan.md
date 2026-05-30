# Implementation Plan: Phase 1A — Core LEGO Mosaic Generator

**Branch**: `001-lego-mosaic-core` | **Date**: 2026-05-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-lego-mosaic-core/spec.md`

---

## Summary

Build an entirely browser-side LEGO mosaic generator: user uploads a face photo, crops it square, adjusts brightness/contrast, and generates a deterministic 32×32 LEGO-palette mosaic with a color matrix and parts list. All image processing uses Canvas 2D APIs + `culori` for CIEDE2000 color matching; no server, no LLM, no external runtime fetches.

---

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) + Astro 4.x

**Primary Dependencies**:
- `cropperjs` v2 (or v1 stable fallback) — square crop UI
- `culori` — CIEDE2000 color distance + nearest-palette-color search
- Native Canvas 2D API — image pixel manipulation, brightness/contrast, downsampling

**Dev Dependencies**:
- `vitest` — unit + regression testing
- `canvas` (npm) — Node.js Cairo bindings for testing pipeline without a browser
- `@vitest/coverage-v8` — coverage reporting

**Storage**: N/A — browser session only, no persistence, no server

**Testing**: Vitest (`environment: 'node'`) + `canvas` npm package + `toMatchFileSnapshot` for regression snapshots

**Target Platform**: Browser — Chrome, Firefox, Safari (latest 2 versions each); desktop only for Phase 1A

**Project Type**: Static web application (Astro `output: 'static'`, single page)

**Performance Goals**: Mosaic generation < 10 seconds for a standard face photo (SC-002); expected to be well under 1s in practice for 32×32 pure-canvas operations

**Constraints**:
- Client-side only — no image data or derived output ever transmitted to a server (FR-013, firm)
- No LLM dependencies in Phase 1A
- Mosaic generation must be deterministic (FR-007)
- No external runtime data fetches — LEGO palette bundled as static JSON

**Scale/Scope**: Single-user browser session; no authentication, no persistence, no multi-user state

---

## Constitution Check

*Gates from `.specify/memory/constitution.md` v1.0.0. Evaluated pre-research and re-confirmed post-design.*

| Gate | Principle | Result | Notes |
|---|---|---|---|
| Client-only processing | I, II | ✅ | All image processing via Canvas 2D API in-browser; FR-013 is a hard constraint |
| Deterministic output | III | ✅ | Average pooling + CIEDE2000 via `culori`; no browser canvas interpolation used |
| Schema extensibility | IV | ✅ | `LegoColor`, `Mosaic`, `PartsList` have optional fields reserved for Phase 2/3 |
| Snapshot coverage | V | ✅ | Regression snapshot at `tests/regression/__snapshots__/mosaic-32x32.snap.json`; CI enforced |
| Algorithmic baseline | VI | ✅ | Entire Phase 1A is algorithmic; no AI/LLM dependency |
| TypeScript strict | Constraints | ✅ | Astro + `strict: true` tsconfig; `any` banned |

---

## Project Structure

### Documentation (this feature)

```text
specs/001-lego-mosaic-core/
├── plan.md              # This file
├── research.md          # Phase 0 research (crop lib, CIEDE2000, Vitest/Canvas)
├── data-model.md        # Entity types and palette JSON schema
├── quickstart.md        # Setup guide and implementation order
├── contracts/
│   ├── pipeline-api.md  # Core algorithm module contracts
│   └── ui-state.md      # UI state machine contract
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── pages/
│   └── index.astro              # Single-page app entry point
├── components/                  # Astro components (markup + event wiring)
│   ├── UploadArea.astro         # File input + privacy notice (FR-015)
│   ├── CropTool.astro           # cropperjs wrapper (FR-002, FR-003)
│   ├── AdjustmentPanel.astro    # Brightness/contrast sliders (FR-004, FR-005)
│   ├── MosaicDisplay.astro      # 32×32 mosaic grid (FR-008, FR-011)
│   ├── ColorMatrix.astro        # 32×32 color identifier grid (FR-009)
│   └── PartsList.astro          # Aggregated parts count (FR-010)
├── lib/
│   ├── app-state.ts             # UI state machine (discriminated union + transitions)
│   ├── mosaic/
│   │   ├── pipeline.ts          # generateMosaic() — orchestrates full pipeline
│   │   ├── downsample.ts        # downsampleToGrid() — average pooling to 32×32
│   │   ├── color-match.ts       # matchColors() — CIEDE2000 nearest-color via culori
│   │   └── parts-list.ts        # derivePartsList() — aggregate color counts
│   └── image/
│       ├── adjust.ts            # applyAdjustments() — brightness/contrast pixel ops
│       └── validate.ts          # File MIME type + size + dimension validation
├── data/
│   └── lego-palette.json        # Static LEGO 1×1 plate color palette (id, name, rgb)
└── types/
    └── index.ts                 # LegoColor, FaceImage, CropSelection, Mosaic, PartsList, …

tests/
├── unit/
│   ├── downsample.test.ts
│   ├── color-match.test.ts
│   ├── adjust.test.ts
│   └── parts-list.test.ts
├── regression/
│   ├── mosaic-pipeline.test.ts
│   └── __snapshots__/
│       └── mosaic-32x32.snap.json
└── fixtures/
    ├── test-face.jpg
    └── solid-white.png
```

**Structure Decision**: Single Astro project at repo root (no frontend/backend split — there is no backend). All processing in `src/lib/` as pure TypeScript functions with no DOM dependencies, making them fully testable in Node via Vitest.

---

## Complexity Tracking

No constitution violations requiring justification. Architecture is straightforward and matches the single-project option from the template.

---

## Phase Artifacts

| Artifact | File | Status |
|---|---|---|
| Feature spec | `specs/001-lego-mosaic-core/spec.md` | ✅ Complete |
| Research | `specs/001-lego-mosaic-core/research.md` | ✅ Complete |
| Data model | `specs/001-lego-mosaic-core/data-model.md` | ✅ Complete |
| Pipeline API contract | `specs/001-lego-mosaic-core/contracts/pipeline-api.md` | ✅ Complete |
| UI state contract | `specs/001-lego-mosaic-core/contracts/ui-state.md` | ✅ Complete |
| Quickstart | `specs/001-lego-mosaic-core/quickstart.md` | ✅ Complete |
| Tasks | `specs/001-lego-mosaic-core/tasks.md` | ⏳ Next (`/speckit-tasks`) |
