<!--
SYNC_IMPACT_REPORT
Version change: (placeholder template) → 1.0.0 — initial ratification
Added principles:
  I.   Privacy by Design
  II.  Browser-First Processing
  III. Deterministic Pipeline
  IV.  Extensible Data Schemas
  V.   Regression-Safe Releases
  VI.  Algorithmic Baseline First
Additional constraints added: TypeScript Strict Mode, No LLM in Phase 1A
Templates checked:
  - .specify/templates/plan-template.md  ✅ Constitution Check section updated with gates table
  - .specify/templates/spec-template.md  ✅ No changes required
  - .specify/templates/tasks-template.md ✅ No changes required
Deferred TODOs: none
-->

# Faceplate Constitution

## Core Principles

### I. Privacy by Design

All image processing, pixel operations, and derived outputs MUST run entirely
within the user's browser. No user-supplied image data, pixel values, or
generated output may be transmitted to any server, third-party service, or
analytics endpoint — under any circumstance, including error reporting.

This is a product promise, not a technical preference. Any future feature that
would require server-side access to user images MUST be explicitly rejected or
redesigned until it satisfies this constraint.

### II. Browser-First Processing

All computation MUST occur client-side unless a specific, documented
performance requirement demonstrably cannot be met in-browser. If a backend
is introduced for a future phase, it MUST NOT receive image data (Principle I
prevails), and its scope MUST be limited to the justified bottleneck.

### III. Deterministic Pipeline

The mosaic generation pipeline MUST produce identical output for identical
inputs on every run, in every browser, across all supported browser versions.
Browser-vendor-dependent behavior (e.g., canvas smoothing interpolation,
sub-pixel rendering) MUST NOT be used in any algorithmic pipeline step.

Any future phase introducing non-deterministic behavior (e.g., AI-generated
suggestions) MUST isolate that behavior from the deterministic core so the
core pipeline remains independently testable and verifiable.

### IV. Extensible Data Schemas

Data entities (LegoColor, Mosaic, PartsList, and any future entities) MUST be
defined with optional fields reserved for known future integration phases
(Phase 2: BrickLink inventory; Phase 3: Studio/BricksCAD export).

Adding optional fields is a non-breaking change and requires no migration.
Removing required fields, changing field types, or renaming existing fields
are breaking changes and MUST be accompanied by a migration plan before
merging.

### V. Regression-Safe Releases

Any change to the mosaic generation pipeline that alters output for existing
inputs MUST:
  1. Update the committed snapshot file
     (`tests/regression/__snapshots__/mosaic-32x32.snap.json`)
     deliberately via `pnpm test --update-snapshots`, never silently.
  2. Include a note in the PR description explaining why the output changed
     and confirming the new output is correct.

No pipeline change may be merged if snapshot tests fail without an explicit
update. CI MUST run snapshot tests on every PR touching `src/lib/`.

### VI. Algorithmic Baseline First

Every core product feature MUST function correctly using deterministic
algorithms before any AI or LLM enhancement layer is added. AI features in
later phases are additive overlays on a working baseline — they MUST NOT be
required for the feature to function.

This ensures the product remains fully operational if AI services are
unavailable, rate-limited, or cost-prohibitive.

## Additional Constraints

### TypeScript Strict Mode

All source code MUST be written in TypeScript with `strict: true` in
`tsconfig.json`. The `any` type MUST NOT appear without an inline suppression
comment explaining why it is unavoidable. This applies across all phases and
all source files.

### No LLM Dependencies in Phase 1A

No LLM or AI service dependency may be introduced in Phase 1A source code.
This is a hard phase constraint. Phase 2+ may add AI features provided
Principle VI is satisfied first.

## Compliance Review

### Constitution Check Gates

| Gate | Principle | Pass Condition |
|---|---|---|
| Client-only processing | I, II | No server processing of image data in scope |
| Deterministic output | III | Pipeline avoids browser-vendor interpolation |
| Schema extensibility | IV | Future optional fields reserved in entity types |
| Snapshot coverage | V | Regression snapshot exists and is CI-enforced |
| Algorithmic baseline | VI | Feature works without AI/LLM |
| TypeScript strict | Constraints | `strict: true` confirmed in tsconfig |

## Governance

The constitution supersedes all other practices and guidelines. Amendments
require:
  1. A documented rationale explaining what changed and why.
  2. Explicit approval from the project owner before merging.
  3. A version bump following semantic versioning:
     - MAJOR: A principle removed, redefined, or made less restrictive.
     - MINOR: A new principle or section added.
     - PATCH: Wording clarification, typo fix, non-semantic refinement.
  4. Updates to all dependent templates and open plans that reference the
     amended principle, listed in a Sync Impact Report.

All PRs touching `src/lib/` or `src/types/` MUST verify compliance with
Principles III, IV, and V. All PRs introducing new npm dependencies MUST
verify compliance with Principles I, II, and VI.

**Version**: 1.0.0 | **Ratified**: 2026-05-30 | **Last Amended**: 2026-05-30
