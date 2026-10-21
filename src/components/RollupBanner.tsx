import type { BrandSystem, CopyBundle } from '../lib/types'
import { textTier } from '../lib/textfit'
import { ContourField, LogoMark, MotifDecor } from './BrandMark'

interface Props {
  brand: BrandSystem
  copy: CopyBundle
  heroUrl: string | null
}

/**
 * 易拉宝 80×200cm：480×1200px（屏幕预览），导出 2400×6000px（5x，满足 150dpi 打印）
 * 结构：安全区 → 品牌区 → 英雄图 → 卖点列表 → CTA → 安全区
 */
export function RollupBanner({ brand, copy, heroUrl }: Props) {
  return (
    <div
      className="bf-rollup"
      data-export={`${brand.brandName}-易拉宝-80x200cm.png`}
      data-export-scale="5"
    >
      {/* 顶部安全区（卷轴遮挡 ~7%） */}
      <div className="bf-rollup-safe-top" />

      {/* 品牌区 */}
      <div className="bf-rollup-brand">
        <LogoMark size={64} brand={brand} />
        <h1 className={`bf-rollup-name ${textTier(brand.brandName + brand.brandNameEn, 6, 10)}`}>
          {brand.brandName}
        </h1>
        <p className="bf-rollup-slogan">{brand.slogan.zh}</p>
      </div>

      {/* 英雄图 / 主视觉 */}
      <div className="bf-rollup-hero">
        {heroUrl ? (
          <img src={heroUrl} alt="主视觉" crossOrigin="anonymous" />
        ) : (
          <div className="bf-rollup-hero-fallback">
            <ContourField seed={7} color={brand.colors.paper} opacity={0.3} />
          </div>
        )}
      </div>

      {/* 核心卖点（2-3 条，取 pillars 前 3） */}
      <div className="bf-rollup-pillars">
        {copy.pillars.slice(0, 3).map((p, i) => (
          <div className="bf-rollup-pillar" key={i}>
            <span className="bf-rollup-pillar-tag">{p.tag}</span>
            <span className="bf-rollup-pillar-title">{p.title}</span>
          </div>
        ))}
      </div>

      {/* 装饰分隔 */}
      <div className="bf-rollup-decor">
        <MotifDecor width={400} height={28} color={brand.colors.accent} brand={brand} />
      </div>

      {/* CTA */}
      <div className="bf-rollup-cta">
        <p className="bf-rollup-cta-headline">{copy.cta.headline}</p>
        <p className="bf-rollup-cta-sub">{copy.cta.sub}</p>
      </div>

      {/* 底部信息条 */}
      <div className="bf-rollup-baseline">
        <span className="bf-en">{brand.brandNameEn}</span>
        <MotifDecor width={200} height={16} color={brand.colors.muted} brand={brand} />
      </div>

      {/* 底部安全区（底座遮挡 ~7%） */}
      <div className="bf-rollup-safe-bottom" />
    </div>
  )
}
