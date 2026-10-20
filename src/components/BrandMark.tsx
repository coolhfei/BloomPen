import type { BrandSystem } from '../lib/types'

/**
 * 程序化品牌图形标记：声波 + 印章意象。
 * 完全由 brand token 驱动，改色即变。
 */
export function LogoMark({ size = 64, brand }: { size?: number; brand: BrandSystem }) {
  const { primary, accent, secondary } = brand.colors
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-label="品牌图形标记">
      <rect x="2" y="2" width="60" height="60" rx="6" fill={primary} />
      <g stroke={accent} strokeWidth="3" strokeLinecap="round">
        <line x1="14" y1="27" x2="14" y2="37" />
        <line x1="22" y1="20" x2="22" y2="44" />
        <line x1="30" y1="25" x2="30" y2="39" />
      </g>
      <g stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.92">
        <line x1="38" y1="16" x2="38" y2="48" />
        <line x1="46" y1="22" x2="46" y2="42" />
      </g>
      <circle cx="53" cy="32" r="3" fill={secondary} />
    </svg>
  )
}

/** 声波装饰线（横贯用） */
export function WaveLine({ width = 400, color = 'currentColor', height = 24 }: { width?: number; color?: string; height?: number }) {
  const bars = Array.from({ length: Math.floor(width / 10) }, (_, i) => {
    const h = 4 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6)) * (height - 6)
    return <rect key={i} x={i * 10} y={(height - h) / 2} width="3.5" height={h} rx="1.75" fill={color} opacity={0.55 + Math.abs(Math.sin(i * 0.9)) * 0.45} />
  })
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      {bars}
    </svg>
  )
}

/** 等高线装饰（背景肌理） */
export function ContourField({ seed = 3, color = 'currentColor', opacity = 0.15 }: { seed?: number; color?: string; opacity?: number }) {
  const paths = Array.from({ length: 7 }, (_, i) => {
    const y = 30 + i * 22
    const a = 12 + ((seed * (i + 3)) % 9)
    return `M -10 ${y} C 80 ${y - a}, 160 ${y + a}, 240 ${y} S 400 ${y - a}, 480 ${y} S 640 ${y + a}, 800 ${y}`
  })
  return (
    <svg className="bf-contour" viewBox="0 0 800 200" preserveAspectRatio="none" aria-hidden style={{ opacity }}>
      {paths.map((d, i) => (
        <path key={i} d={d} stroke={color} strokeWidth="1.2" fill="none" />
      ))}
    </svg>
  )
}
