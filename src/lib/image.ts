const MAX_FILE_BYTES = 8 * 1024 * 1024
const MAX_DIMENSION = 1280
const OUTPUT_QUALITY = 0.82

interface DecodedImage {
  source: CanvasImageSource
  width: number
  height: number
  release(): void
}

export async function compressProductImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecciona un archivo de imagen válido.')
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('La fotografía supera 8 MB. Usa una imagen más liviana.')
  }

  const decoded = await decodeImage(file)
  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(decoded.width, decoded.height))
    const width = Math.max(1, Math.round(decoded.width * scale))
    const height = Math.max(1, Math.round(decoded.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('El navegador no pudo procesar la fotografía.')
    context.drawImage(decoded.source, 0, 0, width, height)

    const webp = await canvasToBlob(canvas, 'image/webp', OUTPUT_QUALITY)
    if (webp?.type === 'image/webp') return webp

    const jpeg = await canvasToBlob(canvas, 'image/jpeg', OUTPUT_QUALITY)
    if (jpeg) return jpeg

    throw new Error('No fue posible comprimir la fotografía.')
  } finally {
    decoded.release()
  }
}

export async function imageFileToDataUrl(file: File): Promise<string> {
  const blob = await compressProductImage(file)
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('No fue posible leer la fotografía.'))
    reader.readAsDataURL(blob)
  })
}

async function decodeImage(file: File): Promise<DecodedImage> {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file)
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      }
    } catch {
      // Algunos navegadores no decodifican todos los formatos mediante createImageBitmap.
    }
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('El navegador no pudo abrir la fotografía.'))
      element.src = objectUrl
    })
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(objectUrl),
    }
  } catch (error) {
    URL.revokeObjectURL(objectUrl)
    throw error
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}
