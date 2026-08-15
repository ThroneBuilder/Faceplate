# Faceplate

A web application for crowdsourcing the generating LEGO face mosaics for my Hall of Faces LEGO creation.

**Live at [faceplate.me](https://faceplate.me)**

## Tech Stack
- **Frontend:** Astro (static site, TypeScript)
- **Vision:** MediaPipe Tasks Vision (face detection)
- **Hosting:** Render (static web service)
- **Testing:** Vitest
- **CI/CD:** GitHub Actions

## Project Structure
```
src/
  components/   → Astro UI components
  lib/          → Core logic (mosaic, image, face-shaping, candidates)
  pages/        → Astro page routes
  data/         → Static data (LEGO colors, parts, etc.)
  types/        → Shared TypeScript types
public/         → Static assets
tests/          → Vitest test suite
specs/          → Feature specifications and plans
docs/           → Project documentation
```

## Documentation
- [Vision](docs/vision.md) — project goals and design direction

## Development
```powershell
# Install dependencies
pnpm install

# Start the dev server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```
