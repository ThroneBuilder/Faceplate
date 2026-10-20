import { defineConfig } from 'astro/config'

export default defineConfig({
  output: 'static',
  redirects: {
    // Phase 005 compatibility alias: /gallery/{slug} → /{slug}
    '/gallery/hall-of-faces': '/hall-of-faces',
    '/gallery/game-of-thrones': '/game-of-thrones',
  },
})
