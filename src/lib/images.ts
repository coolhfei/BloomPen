/** 图像基础 IO：文件 → dataURL、长边下采样、透明像素检测。纯函数可单测，DOM 胶水是薄层。 */

export const PRODUCT_IMAGE_MAX_EDGE = 1600
export const PRODUCT_IMAGE_MAX_BYTES = 10 * 1024 * 1024
export const PRODUCT_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

/** MIME 快路径：只有 PNG/WebP 可能带透明通道 */
export function mayHaveAlpha(mime: string): boolean {
  return mime === 'image/png' || mime === 'image/webp'
}

/** RGBA 像素数组是否存在真实透明像素（步进采样，纯函数） */
export function findTransparentPixel(pixels: Uint8ClampedArray, sampleStep = 16): boolean {
  for (let i = 3; i < pixels.length; i += 4 * sampleStep) {
    if (pixels[i] < 250) return true
  }
  return false
}

export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result))
    fr.onerror = () => reject(new Error('读取文件失败'))
    fr.readAsDataURL(file)
  })
}

/** 长边下采样到 maxEdge（控内存与导出体积）；输出 PNG 以保留潜在透明通道 */
export async function downscaleToDataUrl(dataUrl: string, maxEdge = PRODUCT_IMAGE_MAX_EDGE): Promise<string> {
  const bmp = await createImageBitmap(await (await fetch(dataUrl)).blob())
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height))
  if (scale >= 1) {
    bmp.close()
    return dataUrl
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close()
  return canvas.toDataURL('image/png')
}

/** 检测 dataURL 图像是否含真实透明像素（JPEG 直接 false） */
export async function detectTransparency(dataUrl: string, mime: string): Promise<boolean> {
  if (!mayHaveAlpha(mime)) return false
  const bmp = await createImageBitmap(await (await fetch(dataUrl)).blob())
  const canvas = document.createElement('canvas')
  canvas.width = bmp.width
  canvas.height = bmp.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bmp, 0, 0)
  bmp.close()
  return findTransparentPixel(ctx.getImageData(0, 0, canvas.width, canvas.height).data)
}
