import type { BrandSystem, CopyBundle } from '../lib/types'
import { textTier } from '../lib/textfit'
import { ContourField, LogoMark, MotifDecor } from './BrandMark'

interface Props {
  brand: BrandSystem
  copy: CopyBundle
  heroUrl: string | null
}

/** 宣传册：封面 + 简介 + 内容矩阵 + 排期 + 封底，共 5 页 A4（794×1123） */
export function Brochure({ brand, copy, heroUrl }: Props) {
  return (
    <div className="bf-brochure">
      {/* ── P1 封面 ── */}
      <div className="bf-page bf-cover">
        <div className="bf-cover-top">
          <LogoMark size={54} brand={brand} />
          <div className="bf-cover-brandline">
            <span className="bf-en">{brand.brandNameEn}</span>
            <span className="bf-cat">{brand.category}</span>
          </div>
          <span className="bf-cover-no">上市传播物料包 · 2026</span>
        </div>

        <div className="bf-cover-hero">
          {heroUrl ? (
            <img src={heroUrl} alt="品牌主视觉" crossOrigin="anonymous" />
          ) : (
            <div className="bf-cover-hero-fallback">
              <ContourField seed={5} color={brand.colors.primary} opacity={0.4} />
              <MotifDecor width={360} height={64} color={brand.colors.accent} brand={brand} />
            </div>
          )}
        </div>

        <div className="bf-cover-bottom">
          <h1 className={`bf-cover-name ${textTier(brand.brandName + brand.brandNameEn, 10, 16)}`}>{brand.brandName}</h1>
          <p className="bf-cover-slogan">{brand.slogan.zh}</p>
          <p className="bf-cover-slogan-en">{brand.slogan.en}</p>
        </div>
        <div className="bf-cover-side">{brand.motifs.join(' / ')}</div>
      </div>

      {/* ── P2 品牌简介 ── */}
      <div className="bf-page bf-intro">
        <header className="bf-page-head">
          <span className="bf-page-num">01</span>
          <span className="bf-page-title">关于我们 / About</span>
          <LogoMark size={30} brand={brand} />
        </header>
        <div className="bf-intro-body">
          <p className="bf-intro-text">{copy.intro}</p>
          {copy.dataPoints?.length > 0 && (
            <div className="bf-stats">
              {copy.dataPoints.map((d, i) => (
                <div className="bf-stat" key={i}>
                  <span className="bf-stat-v">{d.value}</span>
                  <span className="bf-stat-k">{d.label}</span>
                </div>
              ))}
            </div>
          )}
          <div className="bf-intro-wave">
            <MotifDecor width={620} height={28} color={brand.colors.secondary} brand={brand} />
          </div>
          <ul className="bf-manifesto">
            {copy.manifesto.map((m, i) => (
              <li key={i}>
                <span className="bf-manifesto-idx">{String(i + 1).padStart(2, '0')}</span>
                <span className="bf-manifesto-text">{m}</span>
              </li>
            ))}
          </ul>
          {copy.quotes[1] && (
            <div className="bf-intro-bottom">
              <p>「{copy.quotes[1].text}」</p>
              <cite>—— {copy.quotes[1].source}</cite>
            </div>
          )}
        </div>
        <footer className="bf-page-foot">
          <span>{brand.brandNameEn}</span>
          <span>{brand.tone.join(' · ')}</span>
        </footer>
      </div>

      {/* ── P3 内容矩阵 ── */}
      <div className="bf-page bf-pillars">
        <header className="bf-page-head">
          <span className="bf-page-num">02</span>
          <span className="bf-page-title">内容矩阵 / Pillars</span>
          <LogoMark size={30} brand={brand} />
        </header>
        <div className="bf-pillar-list">
          {copy.pillars.map((p, i) => (
            <article className="bf-pillar" key={i}>
              <div className="bf-pillar-left">
                <span className="bf-pillar-idx">{String(i + 1).padStart(2, '0')}</span>
                <span className="bf-pillar-tag">{p.tag}</span>
              </div>
              <div className="bf-pillar-main">
                <h3 className="bf-pillar-title">{p.title}</h3>
                <p className="bf-pillar-desc">{p.desc}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="bf-pillars-deco">
          <ContourField seed={7} color={brand.colors.primary} opacity={0.18} />
        </div>
        <footer className="bf-page-foot">
          <span>{brand.brandNameEn}</span>
          <span>{brand.slogan.en}</span>
        </footer>
      </div>

      {/* ── P4 上市排期 ── */}
      <div className="bf-page bf-programs">
        <header className="bf-page-head">
          <span className="bf-page-num">03</span>
          <span className="bf-page-title">上市排期 / Launch</span>
          <LogoMark size={30} brand={brand} />
        </header>
        <div className="bf-program-list">
          {copy.programs.map((p, i) => (
            <div className="bf-program" key={i}>
              <span className="bf-program-no">{p.no}</span>
              <div className="bf-program-main">
                <h4 className="bf-program-title">{p.title}</h4>
                <p className="bf-program-sub">{p.subtitle}</p>
              </div>
              <span className="bf-program-date">{p.date}</span>
            </div>
          ))}
        </div>
        <blockquote className="bf-quote-strip">
          <p>「{copy.quotes[0]?.text ?? ''}」</p>
          <cite>—— {copy.quotes[0]?.source ?? brand.brandName}</cite>
        </blockquote>
        <footer className="bf-page-foot">
          <span>{brand.brandNameEn}</span>
          <span>{copy.programs.length} 档首发内容</span>
        </footer>
      </div>

      {/* ── P5 封底 ── */}
      <div className="bf-page bf-back">
        <div className="bf-back-deco">
          <ContourField seed={11} color={brand.colors.paper} opacity={0.14} />
        </div>
        <div className="bf-back-main">
          <LogoMark size={72} brand={brand} />
          <h2 className="bf-back-headline">{copy.cta.headline}</h2>
          <p className="bf-back-sub">{copy.cta.sub}</p>
          <div className="bf-back-wave">
            <MotifDecor width={420} height={26} color={brand.colors.accent} brand={brand} />
          </div>
          <p className="bf-back-slogan-en">{brand.slogan.en}</p>
        </div>
        <footer className="bf-back-foot">
          <span>{brand.brandName} · {brand.brandNameEn}</span>
          <span>hello@{brand.brandNameEn.toLowerCase().replace(/\s+/g, '')}.fm</span>
          <span>全平台同步收听</span>
        </footer>
      </div>
    </div>
  )
}
