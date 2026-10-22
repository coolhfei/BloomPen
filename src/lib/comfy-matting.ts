/**
 * ComfyUI 抠图（专业路径）：上传图片 → RMBG/BiRefNet 节点 → 透明底 PNG。
 * 需要用户 ComfyUI 装有 ComfyUI-RMBG 或 BiRefNet 自定义节点；没有则报错 → 上层直嵌兜底。
 */
import { arrayBufferToBase64, httpRequest } from './providers/transport'
import { comfyRunToImage } from './providers/image'
import type { ImageConfig } from './providers/types'

const encodeText = (s: string): Uint8Array => new TextEncoder().encode(s)

function decodeBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let off = 0
  for (const p of parts) {
    out.set(p, off)
    off += p.length
  }
  return out
}

export async function comfyMatting(dataUrl: string, cfg: ImageConfig, onProgress?: (m: string) => void): Promise<string | null> {
  const base = cfg.baseURL.replace(/\/+$/, '')
  // 1. 上传图片（手动构造 multipart，复用传输层 bodyBase64 通道）
  const name = `bf-matting-${Date.now()}.png`
  const boundary = `----bfmatting${Date.now().toString(36)}`
  const head = `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${name}"\r\nContent-Type: image/png\r\n\r\n`
  const tail = `\r\n--${boundary}--\r\n`
  const body = concatBytes(encodeText(head), decodeBase64(dataUrl.split(',')[1]), encodeText(tail))
  onProgress?.('ComfyUI 上传商品图…')
  const up = await httpRequest({
    url: `${base}/upload/image`,
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body: arrayBufferToBase64(body.buffer as ArrayBuffer),
    bodyBase64: true,
    responseType: 'json',
    timeoutMs: 60_000,
  })
  if (up.status !== 200) throw new Error(`ComfyUI 上传失败（HTTP ${up.status}）`)

  // 2. 抠图工作流（ComfyUI-RMBG 节点的通用形态；缺节点时 ComfyUI 报错 → 上层兜底）
  const workflow = {
    1: { class_type: 'LoadImage', inputs: { image: name, upload: true } },
    2: { class_type: 'RMBG', inputs: { model: 'RMBG-1.4', image: ['1', 0] } },
    3: { class_type: 'SaveImage', inputs: { filename_prefix: 'bf-cutout', images: ['2', 0] } },
  }
  onProgress?.('ComfyUI 抠图中…')
  return comfyRunToImage(base, workflow, onProgress)
}
