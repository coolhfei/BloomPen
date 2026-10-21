import type { BrandSystem, CopyBundle } from '../lib/types'
import { ContourField, LogoMark, MotifDecor } from './BrandMark'

interface Props {
  brand: BrandSystem
  copy: CopyBundle
  heroUrl: string | null
}

/** 方图 · 卖点卡 1080×1080（社媒第一图：讲清产品帮我干什么） */
export function QuoteCard({ brand, copy }: Props) {
  const cap = copy.socialCaptions[0] ?? { title: brand.slogan.zh, body: '' }
  return (
    <div className="bf-sq bf-quote-card" data-export={`${brand.brandName}-社媒方图-1080x1080.png`}>
      <header className="bf-quote-card-top">
        <LogoMark size={46} brand={brand} />
        <span className="bf-en">@{brand.brandNameEn.toLowerCase().replace(/\s+/g, '')}</span>
      </header>
      <div className="bf-quote-card-main">
        <p className="bf-quote-card-text">{cap.title}</p>
        {cap.body && <p className="bf-quote-card-sub">{cap.body}</p>}
      </div>
      <div className="bf-quote-card-wave">
        <MotifDecor width={280} height={20} color={brand.colors.accent} brand={brand} />
      </div>
      <footer className="bf-quote-card-foot">
        <cite>{brand.brandName}</cite>
        <span className="bf-quote-card-tag"># {brand.tone[0] ?? ''}</span>
      </footer>
    </div>
  )
}

/** 竖图 · 核心板块卡 1080×1440（讲产品第一大能力，配英雄图） */
export function ProgramCard({ brand, copy, heroUrl }: Props) {
  const pillar = copy.pillars[0] ?? { tag: '核心', title: brand.brandName, desc: '' }
  return (
    <div className="bf-vt bf-program-card" data-export={`${brand.brandName}-社媒竖图-1080x1440.png`}>
      <div className="bf-program-card-hero">
        {heroUrl ? (
          <img src={heroUrl} alt="产品主视觉" crossOrigin="anonymous" />
        ) : (
          <div className="bf-program-card-hero-fallback">
            <ContourField seed={4} color={brand.colors.paper} opacity={0.35} />
          </div>
        )}
        <span className="bf-program-card-no">{pillar.tag}</span>
      </div>
      <div className="bf-program-card-body">
        <h3 className="bf-program-card-title">{pillar.title}</h3>
        <p className="bf-program-card-sub">{pillar.desc}</p>
        <div className="bf-program-card-meta">
          <LogoMark size={30} brand={brand} />
          <span>{brand.brandName}</span>
          <span className="bf-program-card-date">{brand.slogan.en}</span>
        </div>
      </div>
    </div>
  )
}

/** 横图 · Banner 1920×1080 */
export function BannerCard({ brand, copy }: Props) {
  return (
    <div className="bf-bn bf-banner" data-export={`${brand.brandName}-社媒横图-1920x1080.png`}>
      <div className="bf-banner-left">
        <LogoMark size={52} brand={brand} />
        <div>
          <h3 className="bf-banner-name">
            {brand.brandName} <span className="bf-en">{brand.brandNameEn}</span>
          </h3>
          <p className="bf-banner-slogan">{brand.slogan.zh}</p>
        </div>
      </div>
      <div className="bf-banner-mid">
        <MotifDecor width={360} height={26} color={brand.colors.accent} brand={brand} />
        <div className="bf-banner-tags">
          {copy.pillars.map((p, i) => (
            <span className="bf-banner-tag" key={i}>
              {p.tag} · {p.title}
            </span>
          ))}
        </div>
      </div>
      <div className="bf-banner-right">
        <span className="bf-banner-cta">{copy.cta.headline}</span>
        <span className="bf-banner-date">{copy.cta.sub}</span>
      </div>
    </div>
  )
}

/** 社媒三件套组合（导出/整版预览用） */
export function Social(props: Props) {
  const cap = (i: number) => props.copy.socialCaptions[i]?.body ?? ''
  return (
    <div className="bf-social-grid">
      <div className="bf-social-cell">
        <QuoteCard {...props} />
        <p className="bf-social-caption">{cap(0)}</p>
      </div>
      <div className="bf-social-cell">
        <ProgramCard {...props} />
        <p className="bf-social-caption">{cap(1)}</p>
      </div>
      <div className="bf-social-cell bf-social-cell-wide">
        <BannerCard {...props} />
        <p className="bf-social-caption">{cap(2)}</p>
      </div>
    </div>
  )
}
