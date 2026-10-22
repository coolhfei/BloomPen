import type { SlotRender } from '../lib/slots'
import type { BrandSystem } from '../lib/types'
import { ContourField } from './BrandMark'

interface Props {
  slot: SlotRender | null
  brand: BrandSystem
  /** 程序化兜底沿用模板既有 <fallback> 类名（如 bf-poster-hero-fallback），保持现状视觉 */
  fallbackClass?: string
  seed?: number
  fallbackColor?: string
  fallbackOpacity?: number
  alt?: string
  /** 兜底区内追加的装饰（如封面的 MotifDecor） */
  children?: React.ReactNode
}

/** 统一图位渲染：composite / embed / hero / procedural 四态；slot=null 不渲染 */
export function SlotVisual({
  slot,
  brand,
  fallbackClass = '',
  seed = 5,
  fallbackColor,
  fallbackOpacity = 0.3,
  alt = '商品图',
  children,
}: Props) {
  if (!slot) return null
  if (slot.mode === 'hero') {
    return (
      <div className="bf-slot bf-slot--hero">
        <img src={slot.src} alt={alt} crossOrigin="anonymous" />
      </div>
    )
  }
  if (slot.mode === 'embed') {
    return (
      <div className="bf-slot bf-slot--embed">
        <img src={slot.src} alt={alt} crossOrigin="anonymous" />
      </div>
    )
  }
  if (slot.mode === 'composite') {
    return (
      <div className="bf-slot bf-slot--composite">
        {slot.bg.kind === 'url' ? (
          <img className="bf-composite-bg" src={slot.bg.src} alt="" crossOrigin="anonymous" />
        ) : (
          <div className="bf-composite-bg bf-composite-bg-procedural">
            <ContourField seed={seed} color={fallbackColor ?? brand.colors.paper} opacity={fallbackOpacity} />
          </div>
        )}
        <img className="bf-composite-fg" src={slot.fg} alt={alt} crossOrigin="anonymous" />
      </div>
    )
  }
  return (
    <div className={`bf-slot ${fallbackClass}`}>
      <ContourField seed={seed} color={fallbackColor ?? brand.colors.paper} opacity={fallbackOpacity} />
      {children}
    </div>
  )
}
