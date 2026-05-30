import type { FaceImage } from '../../types/index.js'
import { PipelineError } from '../../types/index.js'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const MIN_DIMENSION = 100

export async function validateFile(file: File): Promise<FaceImage> {
  if (file.size > MAX_FILE_SIZE) {
    throw new PipelineError('FILE_TOO_LARGE', `File exceeds the 10 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB).`)
  }

  const format = getFormat(file.type)
  if (!format) {
    throw new PipelineError('INVALID_FILE_TYPE', 'Only JPEG and PNG files are supported.')
  }

  const { widthPx, heightPx, objectUrl } = await loadImageDimensions(file)

  if (widthPx < MIN_DIMENSION || heightPx < MIN_DIMENSION) {
    URL.revokeObjectURL(objectUrl)
    throw new PipelineError(
      'IMAGE_TOO_SMALL',
      `Image is too small to produce a useful crop (${widthPx}×${heightPx}px). Minimum size is ${MIN_DIMENSION}×${MIN_DIMENSION}px.`,
    )
  }

  return {
    file,
    format,
    widthPx,
    heightPx,
    fileSizeBytes: file.size,
    objectUrl,
  }
}

function getFormat(mimeType: string): 'jpeg' | 'png' | null {
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return 'jpeg'
  if (mimeType === 'image/png') return 'png'
  return null
}

function loadImageDimensions(file: File): Promise<{ widthPx: number; heightPx: number; objectUrl: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve({ widthPx: img.naturalWidth, heightPx: img.naturalHeight, objectUrl: url })
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new PipelineError('INVALID_FILE_TYPE', 'The file could not be loaded as an image.'))
    }
    img.src = url
  })
}
