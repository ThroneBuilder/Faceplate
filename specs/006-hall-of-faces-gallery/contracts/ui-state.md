# UI Contracts: Phase 006 — Hall of Faces Gallery Pages

## Gallery Page Layout

```
src/pages/[gallery].astro
```

### Header (matches Faceplate home page structure)

```html
<header>
  <div class="header-inner">
    <h1>{gallery.displayName}</h1>
    <p class="tagline">{gallery.description}</p>
    <a class="more-info" href="https://faceplate.me/?hall={gallery.slug}">
      Add your face to this gallery ↗
    </a>
  </div>
</header>
```

CSS classes (`header`, `header-inner`, `tagline`, `more-info`) are the same as on the home page — the gallery page imports or duplicates these styles for visual consistency.

---

### Body — Hall.JPEG Composites

For N submissions, `ceil(max(N, 1) / 6)` composites are rendered. Each composite is a `<canvas>` element that the client-side script fills.

```html
<main>
  <!-- one section per composite -->
  <div class="hall-composite" data-batch-index="0">
    <canvas class="hall-canvas" width="1923" height="1302"></canvas>
  </div>
  <div class="hall-composite" data-batch-index="1">
    <canvas class="hall-canvas" width="1923" height="1302"></canvas>
  </div>
</main>
```

CSS: `.hall-canvas { width: 100%; height: auto; display: block; }` — canvas scales to container width in CSS; native resolution stays 1923×1302 for sharpness.

---

### Client-Side Compositing Script

The gallery page embeds submission data in the rendered HTML:

```html
<script>
  window.GALLERY_BATCHES = [
    // batch 0: slots 0-5
    [
      "/api/gallery-image/hall-of-faces/uuid-1.png",
      "/api/gallery-image/hall-of-faces/uuid-2.png",
      null,   // unfilled slot — show bare alcove
      null,
      null,
      null
    ],
    // batch 1: slots 0-5 for next 6 submissions
    [...]
  ]
</script>
<script src="/scripts/gallery-composite.js" defer></script>
```

`/scripts/gallery-composite.js` (or inline script):
1. Load `Hall.JPEG` once
2. For each batch at `data-batch-index`, get the canvas element
3. Draw `Hall.JPEG` as background
4. For each non-null slot URL: load the PNG, draw it at the calibrated cubby position with `brickPx = round(alcoveH / 56 * 0.57)` centred on `(alcoveCx, alcoveCy)`, apply shadow gradients
5. `null` slots: leave bare alcove showing (no draw)

---

### `?hall=` Pre-fill on faceplate.me

In `src/pages/index.astro` script init block:

```javascript
const hallParam = new URLSearchParams(window.location.search).get('hall')
if (hallParam) {
  groupNameInput.value = hallParam
}
```

This runs on page load before `renderPhase`. The group name field in the face-shaping sidebar is pre-filled; the user may edit it.

---

### Redirect: `/gallery/[slug]` → `/[slug]`

The Phase 005 stub at `src/pages/gallery/[slug].astro` is replaced with a redirect:

```astro
---
export const prerender = false
const { slug } = Astro.params
return Astro.redirect(`/${slug}`, 301)
---
```

---

## New File Structure

```
src/
├── pages/
│   ├── [gallery].astro                    ← main gallery SSR page (new)
│   ├── gallery/
│   │   └── [slug].astro                   ← redirect to /{slug} (replaces Phase 005 stub)
│   └── api/
│       └── gallery/
│           ├── submit.ts                  ← updated redirectUrl + new storage path
│           └── image/
│               └── [slug]/
│                   └── [uuid].ts          ← streams PNG from persistent volume (new)
└── lib/
    └── gallery/
        ├── cubby-slots.ts                 ← CUBBY_SLOTS constants + HALL_W/HALL_H
        └── submissions.ts                 ← read/append submissions.json

public/
└── scripts/
    └── gallery-composite.js               ← client-side Hall.JPEG canvas compositing

gallery-groups.json                        ← updated with description + visibility fields
gallery-data/                              ← local dev only (gitignored)
```
