# Faceplate

**[faceplate.me](https://faceplate.me)** — Turn any face into a LEGO mosaic.

Faceplate combines a passion for coding and LEGO to automate and crowdsource the creation of the Hall of Faces. Upload a photo, crop it, adjust brightness and contrast, and generate a 32×32 LEGO mosaic with a parts list — entirely in your browser.

## Features (Phase 1A)

- Upload and crop a face photo (JPEG/PNG)
- Adjust brightness and contrast with live preview
- Generate a deterministic 32×32 LEGO-palette mosaic
- View a color matrix and parts list (1,024 pieces total)
- 100% client-side — your image never leaves your device

## Development

```bash
pnpm install
pnpm dev        # http://localhost:4321
pnpm test       # unit + regression tests
pnpm build      # static build → dist/
```

## Learn more

[thronebuilder.com/blog/faceplate/](https://thronebuilder.com/blog/faceplate/)
