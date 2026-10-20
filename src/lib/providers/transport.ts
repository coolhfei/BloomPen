/**
 * 传输层：桌面端走 Electron 主进程（Node fetch，无 CORS 问题）；
 * Web 模式直接 fetch（本地服务需按文档开启 CORS）。
 * 所有模型/图片字节请求统一经此层，适配器不关心运行形态。
 */

export interface BridgeRequest {
  url: string
  method?: string
  headers?: Record<string, string>
  /** string 或 base64 标记的二进制 */
  body?: string
  bodyBase64?: boolean
  /** 期望响应形态 */
  responseType: 'json' | 'text' | 'base64'
  timeoutMs?: number
}

export interface BridgeResponse {
  status: number
  /** responseType=json/text 时为文本；base64 时为 base64 字符串 */
  body: string
}

interface BfBridge {
  isDesktop: true
  request(req: BridgeRequest): Promise<BridgeResponse>
  pdfFromHtml(html: string, defaultName: string): Promise<string | null>
}

declare global {
  interface Window {
    bfBridge?: BfBridge
  }
}

export const isDesktop = (): boolean => typeof window !== 'undefined' && !!window.bfBridge

export async function httpRequest(req: BridgeRequest): Promise<BridgeResponse> {
  if (window.bfBridge) return window.bfBridge.request(req)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), req.timeoutMs ?? 120_000)
  try {
    const res = await fetch(req.url, {
      method: req.method ?? 'GET',
      headers: req.headers,
      body: req.bodyBase64 ? Uint8Array.from(atob(req.body ?? ''), (c) => c.charCodeAt(0)) : req.body,
      signal: controller.signal,
    })
    if (req.responseType === 'base64') {
      const buf = await res.arrayBuffer()
      return { status: res.status, body: arrayBufferToBase64(buf) }
    }
    return { status: res.status, body: await res.text() }
  } finally {
    clearTimeout(timer)
  }
}

/** 拉取任意 URL 的字节并转 base64（生图产物统一 dataURL 化，规避 CORS/过期问题） */
export async function fetchBase64(url: string, headers?: Record<string, string>): Promise<string> {
  const res = await httpRequest({ url, headers, responseType: 'base64', timeoutMs: 120_000 })
  if (res.status < 200 || res.status >= 300) throw new Error(`下载图片失败（HTTP ${res.status}）`)
  return res.body
}

export function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export function base64ToDataUrl(b64: string, mime = 'image/png'): string {
  return `data:${mime};base64,${b64}`
}
