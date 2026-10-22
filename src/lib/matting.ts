/**
 * 抠图调度：① 透明底直通（零成本）→ ② 本地内置引擎（imgly ISNet，打进安装包）
 *           → ③ ComfyUI（可选专业路径，见 comfy-matting.ts）。
 * 任一层失败 → null，调用方直嵌兜底；抠图永不杀死生成流程。
 */
import { detectTransparency, fileToDataUrl } from './images'
import { isDesktop } from './providers/transport'
import type { ImageConfig } from './providers/types'
import { comfyMatting } from './comfy-matting'

export interface MattingHooks {
  onProgress?: (msg: string) => void
  /** 用户已配置的生图适配器；ComfyUI 时启用专业抠图兜底 */
  imageCfg?: ImageConfig
}

/** 为一张商品图获取透明底版本；失败返回 null（直嵌兜底） */
export async function ensureCutout(dataUrl: string, mime: string, hooks: MattingHooks = {}): Promise<string | null> {
  try {
    if (await detectTransparency(dataUrl, mime)) return dataUrl
  } catch {
    /* 检测失败则继续走抠图 */
  }
  const local = await localMatting(dataUrl, hooks.onProgress).catch((e) => {
    console.warn('[matting] 本地引擎失败：', e)
    return null
  })
  if (local) return local
  if (hooks.imageCfg?.kind === 'comfyui') {
    return comfyMatting(dataUrl, hooks.imageCfg, hooks.onProgress).catch((e) => {
      console.warn('[matting] ComfyUI 抠图失败：', e)
      return null
    })
  }
  return null
}

/**
 * 本地内置引擎：@imgly/background-removal（ISNet small，~40MB）。
 * 桌面端资源在安装包内（bf-res://matting/，见 electron/main.cjs）；
 * Web 版由库默认走 CDN 拉取并缓存，拉不到则 reject → 上层兜底。
 */
async function localMatting(dataUrl: string, onProgress?: (m: string) => void): Promise<string | null> {
  onProgress?.('本地抠图中…')
  const mod = (await import('@imgly/background-removal')) as unknown as {
    default?: (b: Blob, c?: Record<string, unknown>) => Promise<Blob>
    removeBackground?: (b: Blob, c?: Record<string, unknown>) => Promise<Blob>
  }
  const removeBackground = mod.default ?? mod.removeBackground
  if (!removeBackground) throw new Error('抠图引擎不可用')
  const blob = await (await fetch(dataUrl)).blob()
  const out = await removeBackground(blob, {
    model: 'small',
    output: { format: 'image/png' },
    ...(isDesktop() ? { publicPath: 'bf-res://matting/' } : {}),
  })
  return fileToDataUrl(out)
}
