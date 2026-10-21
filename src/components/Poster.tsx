import type { BrandSystem, CopyBundle } from '../lib/types'
import { textTier } from '../lib/textfit'
import { ContourField, LogoMark, MotifDecor } from './BrandMark'

interface Props {
  brand: BrandSystem
  copy: CopyBundle
  heroUrl: string | null
}

/** 主视觉海报：800×1200（2:3） */
export function Poster({ brand, copy, heroUrl }: Props) {
  return (
    <div className="bf-poster">
      {heroUrl ? (
        <img className="bf-poster-hero" src={heroUrl} alt="主视觉" crossOrigin="anonymous" />
      ) : (
        <div className="bf-poster-hero bf-poster-hero-fallback">
          <ContourField seed={9} color={brand.colors.paper} opacity={0.3} />
        </div>
      )}
      <div className="bf-poster-shade" />
      <header className="bf-poster-top">
        <LogoMark size={44} brand={brand} />
        <div className="bf-poster-topline">
          <span className="bf-en">{brand.brandNameEn}</span>
          <span className="bf-poster-cat">{brand.category}</span>
        </div>
      </header>
      <div className="bf-poster-main">
        <h1 className={`bf-poster-name ${textTier(brand.brandName + brand.brandNameEn, 10, 16)}`}>{brand.brandName}</h1>
        <p className="bf-poster-slogan">{brand.slogan.zh}</p>
        <div className="bf-poster-wave">
          <MotifDecor width={300} height={22} color={brand.colors.accent} brand={brand} />
        </div>
        <p className="bf-poster-quote">「{copy.quotes[1]?.text ?? copy.manifesto[0]}」</p>
      </div>
      <footer className="bf-poster-foot">
        <span className="bf-poster-cta">{copy.cta.sub}</span>
        <span className="bf-poster-slogan-en">{brand.slogan.en}</span>
      </footer>
    </div>
  )
}
