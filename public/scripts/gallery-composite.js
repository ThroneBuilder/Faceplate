(function () {
  'use strict'

  const batches = window.GALLERY_BATCHES
  const { CUBBY_SLOTS, HALL_W, HALL_H, HALL_MOSAIC_SCALE } = window.HALL_COMPOSITING_CONSTANTS

  // Load Hall.JPEG once
  const hallImgPromise = new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = '/images/Hall.JPEG'
  })

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)  // graceful: null = skip slot
      img.src = url
    })
  }

  function drawShadow(ctx, edgeX, direction, brickH, shadowW) {
    const grad = ctx.createLinearGradient(edgeX, 0, edgeX + direction * shadowW, 0)
    grad.addColorStop(0, 'rgba(0,0,0,0.35)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad
    const x = direction > 0 ? edgeX : edgeX - shadowW
    ctx.fillRect(x, 0, shadowW, brickH)
  }

  async function renderBatch(batchIndex, batch) {
    const canvas = document.querySelector(`canvas[data-batch-index="${batchIndex}"]`)
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    canvas.width  = HALL_W
    canvas.height = HALL_H

    // 1. Draw Hall.JPEG background
    const hallImg = await hallImgPromise
    ctx.drawImage(hallImg, 0, 0, HALL_W, HALL_H)

    // 2. Composite each slot
    for (let i = 0; i < batch.length; i++) {
      const url = batch[i]
      if (!url) continue  // empty slot — bare alcove

      const slot = CUBBY_SLOTS[i]
      if (!slot) continue

      const mosaicImg = await loadImage(url)
      if (!mosaicImg) continue  // missing/corrupt — skip

      // Anchor width = 32 bricks × brickPx; derive height from actual PNG dimensions
      // so shorter mosaics (26, 28-brick) render shorter, not stretched to 32-brick height
      const brickPx = Math.round(HALL_H * HALL_MOSAIC_SCALE / 32)
      const mosW    = 32 * brickPx
      const mosH    = Math.round(mosW * mosaicImg.naturalHeight / mosaicImg.naturalWidth)

      const offsetX = slot.alcoveCx - Math.floor(mosW / 2)
      const offsetY = slot.alcoveCy - Math.floor(mosH / 2)

      ctx.drawImage(mosaicImg, offsetX, offsetY, mosW, mosH)

        // 3. Shadow gradients at face boundary edges (optional at small brickPx)
      if (brickPx >= 4) {
        const shadowW = brickPx * 3
        ctx.save()
        ctx.beginPath()
        ctx.rect(offsetX, offsetY, mosW, mosH)
        ctx.clip()
        // Left shadow
        drawShadow(ctx, offsetX, 1, mosH, shadowW)
        // Right shadow
        drawShadow(ctx, offsetX + mosW, -1, mosH, shadowW)
        ctx.restore()
      }
    }
  }

  hallImgPromise
    .then(() => {
      for (let i = 0; i < batches.length; i++) {
        renderBatch(i, batches[i])
      }
    })
    .catch(err => console.warn('[gallery] Failed to load Hall.JPEG', err))
})()
