# Research: Phase 2A/2B — Mosaic Candidate Grid and Iterative Selection

**Branch**: `003-mosaic-candidates` | **Date**: 2026-05-31

---

## 1. Constitution Conflict Resolution: API vs. Client-Side

### Decision: Web Workers (client-side parallel generation)

**Rationale**: Constitution Principle I prohibits transmitting user image data, pixel values, or generated output to any server "under any circumstance, including error reporting." Principle II reinforces this: if a backend is introduced, it MUST NOT receive image data and Principle I prevails.

The spec clarification session (Q1, answer B) accepted sending the cropped image to a first-party server. This directly conflicts with Principle I. Per the constitution's governance clause, any relaxation of Principle I is a MAJOR amendment requiring explicit project-owner approval before implementation begins.

**Resolution for this plan**: Design around the constitution-compliant path. The API path (answer B) is documented as a potential constitution amendment and requires a separate approval decision before it may be built.

### API path analysis (for amendment decision)

If the constitution is amended to permit first-party server image transmission:

| Factor | Client Web Workers | Server API |
|--------|--------------------|------------|
| Privacy | ✅ Image never leaves browser | ⚠️ Image in transit; ephemeral server storage |
| Performance | ~2–6s on 4-core; ~1–3s on 8-core | ~0.5–1s regardless of client hardware |
| Infrastructure cost | $0 | Server compute + egress per session |
| Cold-start risk | None | First request after idle: +1–3s |
| Offline capable | ✅ Yes | ❌ No |
| Constitution compliant | ✅ Yes | ❌ Requires MAJOR amendment |

**If amendment is approved**, a server API could receive only the cropped ImageData (as PNG/JPEG), run the CIEDE2000 pipeline 9× in parallel, and return 9 Mosaic grids — total round-trip ~1s on server hardware. The server MUST be stateless and MUST NOT log image data.

**Constitution-compliant hybrid approaches (all rejected)**:
- Send base mosaic (brick colors) + B/C params to server: still transmits "generated output" (Principle I).
- Send only palette + B/C params: server cannot generate without the image; requires image.
- WASM acceleration on client: viable enhancement, does not require amendment. Evaluated in §3.

---

## 2. Parallel Client-Side Generation: Web Workers

### Decision: Progressive Web Workers with ArrayBuffer transfer

**Implementation approach**:
1. When candidate grid initialises, spawn `min(9, navigator.hardwareConcurrency)` workers from a shared `mosaic-worker.ts` script.
2. Each worker receives three transferables/copies:
   - `imageBuffer: ArrayBuffer` — a **copy** of `HeadCropSelection.imageData.data.buffer` (Uint8ClampedArray → ArrayBuffer). Transferring rather than cloning is not possible for the main copy (other workers need it too); structured-clone is used per worker.
   - `width: number`, `height: number` — to reconstruct ImageData inside the worker.
   - `brightnessOffset: number`, `contrastOffset: number` — the candidate parameters.
   - `palette: LegoColor[]` — serialised as JSON string (sent once, reused).
3. Worker reconstructs `new ImageData(new Uint8ClampedArray(imageBuffer), width, height)`, applies brightness/contrast, and calls the existing `generateMosaic` function.
4. Worker posts back `{ index: number, mosaic: Mosaic }`.
5. Main thread updates grid state as each result arrives (progressive rendering).

**Why structured-clone instead of transfer for imageBuffer**: All 9 workers need the same pixel data. Transferring (zero-copy) would null the ArrayBuffer in the sender. Structured-clone copies ~(W×H×4) bytes per worker — for a 32×32 mosaic at 1px-per-brick source that's trivial; for the actual crop (e.g., 600×600px), that's ~1.4 MB × 9 ≈ 12.6 MB total, which is acceptable.

**Alternative considered: SharedArrayBuffer** — requires COOP/COEP response headers (`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`). Setting these headers in an Astro static site requires server configuration and breaks some third-party scripts. Rejected for now; structured-clone is simpler and sufficient.

**Alternative considered: OffscreenCanvas** — would allow GPU-accelerated canvas operations in a worker, but the existing CIEDE2000 pipeline is a pure TypeScript computation that doesn't use canvas. No benefit.

### Performance estimates

Based on Phase 1A observations ("typically <1s" for one mosaic):

| Device class | Single mosaic (T) | 9 serial | 4 workers (ceil(9/4)=3 batches) | 8 workers (ceil(9/8)=2 batches) |
|---|---|---|---|---|
| Fast desktop | 0.3s | 2.7s | 0.9s ✅ | 0.6s ✅ |
| Typical laptop | 0.7s | 6.3s | 2.1s ✅ | 1.4s ✅ |
| Slow/old laptop | 1.5s | 13.5s | 4.5s ❌ | 3.0s ≈ |

On a 4-core machine, the 3-second SC-001 target is met for fast and typical devices. Slow devices may exceed the target. Progressive rendering mitigates perceived latency: users see the first completed cells within `T` seconds.

**Recommendation**: Ship with Web Workers. Measure actual generation time in production. If slow-device performance is unacceptable, WASM optimisation (§3) is the next step — no constitution amendment required.

---

## 3. WASM Optimisation (future fallback)

### Decision: Deferred — evaluate after measuring production performance

The CIEDE2000 inner loop (per-cell nearest-colour search) is the computational bottleneck. Porting just the `matchColors` function to WASM could yield 3–10× speedup with no privacy implications.

**How**: Compile `color-match.ts` → AssemblyScript or a Rust WASM crate. Load as a WASM module in the worker; the rest of the pipeline (downsample, mosaic assembly) stays in TypeScript.

**Trigger condition**: If median generation time on real user devices exceeds 1.5s (measured via `performance.now()` around `generateMosaic`), prioritise WASM optimisation before considering any architecture change.

---

## 4. Iterative Search Algorithm: Step Halving

### Decision: Keep step halving for v1; flag for post-launch evaluation

**Current spec**: step halves each iteration (step = 67 → 33 → 17 → 8 → 4 → 2 → 1).

**User observation**: The 3×3 grid divides each axis into thirds, not halves. Pure ternary search (step/3) would exactly tile each third. Step halving produces a new grid that is slightly wider than one third of the previous range, causing minor overlap with adjacent regions.

**Analysis**:

| Approach | New grid range | Coverage of chosen third | Overlap with adjacent thirds |
|---|---|---|---|
| Step/2 (current) | center ± step/2 | ~100% of chosen third + ~50% of adjacent | Yes, ~1/6 of adjacent each side |
| Step/3 (pure ternary) | center ± step/3 | ~100% of chosen third | None, but leaves gap at third boundary |
| Step/2.5 | center ± step/2.5 | ~100% + small overlap | Minimal |

Step halving provides denser coverage of the selected region at the cost of re-sampling adjacent areas slightly. This is better for user exploration (they see more of the neighbourhood) but slightly less efficient at pure convergence. Pure ternary (step/3) converges faster theoretically but may feel "jumpy."

**Decision**: Keep step halving (step/2). Post-launch, instrument click heatmaps on the 3×3 grid. If users consistently choose the center cell (indicating they aren't converging efficiently), revisit with step/3 or a random-perturbation overlay.

---

## 5. Cache Strategy

### Decision: In-memory Map keyed by `"${b}:${c}"`

**Rationale**: All candidates in a session use the same crop (same `HeadCropSelection.imageData`). The only distinguishing parameters are brightness and contrast offsets. A simple string key is collision-free within the session's ±100 integer domain (201 × 201 = 40,401 possible keys — far fewer in practice).

**Eviction**: None needed. Maximum unique keys generated in one session: bounded by iterations × 9. Even 20 iterations = 180 unique candidates. Each Mosaic is a `number[][]` grid (32 × H ints) ≈ 4–8 KB per entry. 180 entries ≈ 1.5 MB — negligible.

**Alternative**: LRU with max 50 entries — adds complexity with no practical benefit given the small session size.

---

## 6. Brightness/Contrast Adjustment in Worker

### Decision: Apply adjustment before passing ImageData to generateMosaic

The existing `AdjustedImage` type captures `brightnessOffset` and `contrastOffset`. The worker must apply these adjustments to the ImageData pixels before calling `generateMosaic`. The adjustment function (`applyBrightnessContrast`) already exists in the pipeline; it will be extracted to a shared utility importable by both the main thread and workers.

**Worker input**: raw crop ImageData + (b, c) offsets → worker applies adjustment → calls `generateMosaic(adjustedImageData, palette)`.

---

## Summary of Decisions

| Topic | Decision | Alternatives Rejected |
|-------|----------|-----------------------|
| Parallel generation | Web Workers, structured-clone per worker | API (constitution), SharedArrayBuffer (COOP headers), serial (too slow) |
| WASM | Deferred — measure first | Premature optimisation |
| Search algorithm | Step halving (÷2), minimum 1 | Step/3 (gaps at boundary), random perturbation (post-launch option) |
| Cache | In-memory Map keyed by `"${b}:${c}"` | LRU (unnecessary), SessionStorage (serialisation overhead) |
| ImageData transfer | Structured-clone (all workers get a copy) | Transfer (nulls source), SharedArrayBuffer (header complexity) |
