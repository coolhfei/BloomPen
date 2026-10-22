import type { ProductImage } from './types'

/** 图位渲染指令：模板层只消费它，不自行决策（纯展示铁律） */
export type SlotRender =
  | { mode: 'composite'; bg: { kind: 'url'; src: string } | { kind: 'procedural' }; fg: string }
  | { mode: 'embed'; src: string }
  | { mode: 'hero'; src: string }
  | { mode: 'procedural' }

export type SlotPurpose = 'hero' | 'inline'

/**
 * 统一渲染决策（纯函数，智能降级的唯一事实来源）：
 * 主视觉位：主图有透明底 → composite（AI 场景/程序化底 + 商品叠加）
 *           有真图 → embed 直嵌；无真图 → hero / procedural（现状兜底）
 * 内页图位：仅 embed，取第 index 张非主图；没有 → null
 */
export function resolveSlot(
  products: ProductImage[],
  heroUrl: string | null,
  purpose: SlotPurpose,
  index = 0
): SlotRender | null {
  if (purpose === 'inline') {
    const img = products.filter((p) => !p.isMain)[index]
    return img ? { mode: 'embed', src: img.dataUrl } : null
  }
  const main = products.find((p) => p.isMain) ?? products[0]
  if (main?.cutoutUrl) {
    return {
      mode: 'composite',
      bg: heroUrl ? { kind: 'url', src: heroUrl } : { kind: 'procedural' },
      fg: main.cutoutUrl,
    }
  }
  if (main) return { mode: 'embed', src: main.dataUrl }
  if (heroUrl) return { mode: 'hero', src: heroUrl }
  return { mode: 'procedural' }
}
