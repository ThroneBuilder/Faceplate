# Research: Phase 005 — Save, Share, and Export

## Decision 1: Session Storage API

**Decision**: IndexedDB for the full session blob (image + all state), keyed by a fixed string `"faceplate-session"`. A lightweight metadata record in `localStorage` stores only the expiry timestamp (for fast expiry checking on page load without opening IndexedDB).

**Rationale**: The uploaded image can be 500 KB–3 MB as a Blob; `localStorage` is limited to ~5 MB and stores strings only (base64-encoding an image adds ~33% overhead). IndexedDB handles binary Blobs natively, has a practical limit of 50–100 MB, and is supported in all modern browsers. `localStorage` is retained only for the expiry timestamp since reading it is synchronous and avoids opening the database for the common case of an expired or absent session.

**Alternatives considered**:
- `localStorage` only: Too small for image data; base64 overhead makes it impractical.
- `document.cookie`: 4 KB limit — completely unsuitable for image data.
- `sessionStorage`: Cleared on tab close; does not survive the "return to page" scenario.
- Cache API: Designed for HTTP responses, not structured application state.

---

## Decision 2: Session Serialisation Format

**Decision**: Store a single object in IndexedDB with two top-level keys:
- `"metadata"`: a JSON-serialisable record containing all non-binary state (crop params, mosaic grid, mask, candidate key, brick height, distance, timestamp)
- `"imageBlob"`: the EXIF-corrected, full-resolution cropped image as a native `Blob`

**Rationale**: Separating binary data from metadata allows the metadata to be serialised/deserialised with `JSON.parse`/`JSON.stringify` while the image is stored as a first-class Blob (no encoding overhead). The IndexedDB object store can hold both as a plain JS object with mixed value types.

**Expiry**: The metadata record includes a `savedAt` ISO timestamp. On page load, if `Date.now() - savedAt > 30 * 24 * 60 * 60 * 1000` the session is discarded and the IndexedDB record deleted.

---

## Decision 3: ZIP Generation

**Decision**: JSZip (v3.x) — client-side JavaScript library for generating ZIP files in the browser.

**Rationale**: JSZip is the de-facto standard for browser-side ZIP creation; well maintained; ~100 KB minified; generates Blobs directly usable with `URL.createObjectURL` for download. No server round-trip required.

**Alternatives considered**:
- Server-side ZIP: Adds latency, requires image transmission to server, contradicts the client-only principle for the download path.
- `fflate` (alternative): Faster but less widely used; JSZip has broader documentation and community examples.

**New dependency**: `jszip` — must be added to `package.json`.

---

## Decision 4: face-mosaic.png Rendering

**Decision**: Canvas 2D API, rendered at **10 px per brick** (same scale as the main mosaic display). Masked cells are rendered as fully transparent (`clearRect`); visible cells as solid brick colour (`fillRect`). Output: PNG Blob via `canvas.toBlob('image/png')`.

**Rationale**: 10 px/brick gives a 320×320 px PNG for a 32×32 mosaic — large enough to be useful as a standalone image, small enough to be fast and compact. Using the same rendering pipeline as the existing mosaic grid ensures pixel-perfect consistency with what the user sees on screen.

**Transparency**: The canvas is initialised with `clearRect(0, 0, W, H)` so the default fill is transparent. Only visible cells are painted; masked cells remain transparent.

---

## Decision 5: BrickLink XML Format

**Decision**: BrickLink Wanted List XML v1 format. One `<ITEM>` per unique colour in the mosaic, using `ITEMID=3024` (1×1 plate) and the BrickLink colour ID from the existing palette (`LegoColor.brickLinkColorId`).

**Verification needed**: The `brickLinkColorId` field on `LegoColor` must be confirmed as populated for all colours used in the app's palette. If any colour lacks a BrickLink ID, that colour is omitted from the XML and noted in the readme.

**Format**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<INVENTORY>
  <ITEM>
    <ITEMTYPE>P</ITEMTYPE>
    <ITEMID>3024</ITEMID>
    <COLOR>{brickLinkColorId}</COLOR>
    <MINQTY>{count}</MINQTY>
    <CONDITION>N</CONDITION>
  </ITEM>
</INVENTORY>
```

**Alternatives considered**:
- BrickLink CSV: Less standard for wanted-list import; XML is the officially documented format.

---

## Decision 6: LDraw / Studio LDR Format

**Decision**: LDraw MPD/LDR flat file. One line per visible mosaic brick, using LDraw part `3024.dat` (1×1 plate). Position: row `r`, column `c` → `x = c × 20`, `y = 0`, `z = r × 20` (LDraw units, 1 stud = 20 LDU). Colour: LDraw colour ID from `LegoColor.studioColorId`.

**Verification needed**: `studioColorId` must be confirmed as populated for all palette colours. Any colour lacking an ID uses LDraw colour `16` (current colour placeholder) with a comment in the readme.

**Format per brick**:
```
1 {studioColorId} {x} 0 {z} 1 0 0 0 1 0 0 0 1 3024.dat
```

**Header**:
```
0 Faceplate Mosaic
0 Generated by Faceplate.me
```

**Mask handling**: Only visible (unmasked) cells are included in the LDR file. Masked cells are omitted.

**Alternatives considered**:
- BrickLink Studio native format (`.io`): Proprietary binary; LDraw is the open, universally compatible standard.

---

## Decision 7: Gallery Server Architecture

**Decision**: Astro API route (`src/pages/api/gallery/submit.ts`) using Astro's **hybrid output mode** with a Node.js adapter. The route accepts a `multipart/form-data` POST with `group_name` and `mosaic` (PNG Blob). It validates the group name against a server-side list of admin-created groups, stores the PNG, and returns a redirect URL.

**Group management**: Admin-created groups are stored in a server-side JSON config file (`gallery-groups.json`) deployed with the server. Adding a group requires an admin to update this file and redeploy. No database is required for Phase 005 — the group list is small and static.

**Storage for submitted mosaics**: Submitted PNGs are written to a persistent directory on the server (e.g., `public/gallery/{group_slug}/{uuid}.png`). The redirect URL points to `/gallery/{group_slug}` (the gallery page, which is a future spec).

**Rationale**: Astro hybrid mode allows the main app to remain a static client-side SPA while adding server-only API routes for gallery submission. This avoids introducing a separate server process. The Node.js adapter is required for server-mode routes on Render.com.

**Constitution compliance**: This is first-party server storage of a user-derived, user-consented masked mosaic (not original image pixel data). Principle I prohibits third-party transmission and background transmission of user image data — this submission is explicit, user-initiated, and to a first-party server. The constitution's ephemeral server exception (for performance) does not apply here, but the gallery submission is permitted under Principle I because (1) only the masked derived output (not original pixels) is transmitted, (2) the user explicitly initiates the action, and (3) the server is first-party. This must be documented in plan.md before implementation.

**New dependency**: `@astrojs/node` adapter for Astro hybrid output mode.

**Alternatives considered**:
- Separate backend service (Express/Fastify): More operational complexity; Astro hybrid routes keep the architecture unified.
- Serverless function (Netlify/Vercel): Vendor lock-in; current hosting is Render.com.
- No gallery server (static gallery): Cannot accept dynamic submissions without a server.

---

## Decision 8: Mosaic PNG Scale in ZIP vs Cubby

**Decision**: The `face-mosaic.png` in the download ZIP and the image submitted to the gallery use the **same rendering function** — 10 px/brick, transparent background, masked cells omitted. This ensures the downloaded and shared images are identical and consistent with on-screen display.

The cubby projection (which uses a different scale and overlays `Cubby.JPEG`) is NOT included in the download or gallery submission; only the standalone masked mosaic is included.
