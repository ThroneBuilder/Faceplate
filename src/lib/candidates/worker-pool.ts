import type { CandidateGrid, CandidateKey, LegoColor, Mosaic, WorkerInput, WorkerOutput } from '../../types/index.js'
import { candidateCacheKey } from './cache.js'
import { putCached } from './cache.js'
import type { CandidateCache } from '../../types/index.js'

export interface BatchOptions {
  grid: CandidateGrid
  missing: CandidateKey[]
  cropImageData: ImageData
  brickWidth: number
  brickHeight: WorkerInput['height']
  palette: LegoColor[]
  cache: CandidateCache
  onCellReady: (index: number, mosaic: Mosaic, durationMs?: number) => void
  onCellError: (index: number, error: string) => void
  signal: AbortSignal
}

export async function spawnCandidateBatch(options: BatchOptions): Promise<void> {
  const { grid, missing, cropImageData, brickWidth, brickHeight, palette, cache, onCellReady, onCellError, signal } = options

  if (missing.length === 0) return

  const concurrency = Math.min(missing.length, navigator.hardwareConcurrency ?? 4)
  const imageBuffer = cropImageData.data.buffer.slice(0)
  const imageWidth  = cropImageData.width
  const imageHeight = cropImageData.height

  // Map from key string → cell index in grid
  const keyToIndex = new Map<string, number>()
  for (let i = 0; i < 9; i++) {
    keyToIndex.set(candidateCacheKey(grid.cells[i].key), i)
  }

  return new Promise<void>((resolve) => {
    let remaining = missing.length
    let dispatched = 0

    if (signal.aborted) { resolve(); return }

    const onAbort = () => {
      workers.forEach(w => w.terminate())
      resolve()
    }
    signal.addEventListener('abort', onAbort, { once: true })

    const workers: Worker[] = []

    function dispatch(): void {
      while (dispatched < missing.length && workers.filter(w => w).length < concurrency) {
        const key = missing[dispatched++]
        const cellIndex = keyToIndex.get(candidateCacheKey(key)) ?? -1

        const input: WorkerInput = {
          index: cellIndex,
          imageBuffer: imageBuffer.slice(0),  // structured clone per worker
          imageWidth,
          imageHeight,
          brightnessOffset: key.brightnessOffset,
          contrastOffset: key.contrastOffset,
          palette,
          width: brickWidth,
          height: brickHeight,
        }

        const worker = new Worker(
          new URL('./mosaic-worker.ts', import.meta.url),
          { type: 'module' },
        )

        workers.push(worker)

        worker.onmessage = (e: MessageEvent<WorkerOutput>) => {
          if (signal.aborted) { worker.terminate(); return }
          const { index, mosaic, error, durationMs } = e.data
          worker.terminate()
          if (mosaic) {
            putCached(cache, grid.cells[index].key, mosaic)
            onCellReady(index, mosaic, durationMs)
          } else {
            onCellError(index, error ?? 'Unknown worker error')
          }
          remaining--
          if (remaining === 0) {
            signal.removeEventListener('abort', onAbort)
            resolve()
          }
          dispatch()
        }

        worker.onerror = (e) => {
          if (signal.aborted) { worker.terminate(); return }
          worker.terminate()
          if (cellIndex >= 0) onCellError(cellIndex, e.message ?? 'Worker error')
          remaining--
          if (remaining === 0) {
            signal.removeEventListener('abort', onAbort)
            resolve()
          }
          dispatch()
        }

        worker.postMessage(input)
      }
    }

    dispatch()
  })
}
