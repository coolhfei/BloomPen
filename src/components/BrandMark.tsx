import type { BrandSystem } from '../lib/types'

/** 装饰图形族：按品牌母题自动选择，避免给非音频品牌乱用声波 */
export type DecorKind = 'wave' | 'contour' | 'dots' | 'diagonal' | 'arcs'

const NON_AUDIO: DecorKind[] = ['arcs', 'dots', 'diagonal', 'contour']

/** 从品牌母题/品类推断装饰族：关键词命中优先，否则按品牌名哈希稳定分散 */
export function pickDecor(brand: BrandSystem): DecorKind {
  const text = `${brand.category} ${brand.motifs.join(' ')} ${brand.brandName} ${brand.slogan.zh}`.toLowerCase()
  if (/声|音|播客|podcast|audio|fm|radio/.test(text)) return 'wave'
  if (/山|城|等高|地形|地图|contour|topo|map|街/.test(text)) return 'contour'
  if (/点|格|网点|dot|grid|像素|矩阵/.test(text)) return 'dots'
  if (/线|纹|织|斜|条|stripe|line|织物|纸纹/.test(text)) return 'diagonal'
  if (/弧|圆|环|光|圈|arc|circle|ring|halo/.test(text)) return 'arcs'
  const h = [...`${brand.brandName}${brand.brandNameEn}`].reduce((a, c) => a + (c.codePointAt(0) ?? 0), 0)
  return NON_AUDIO[h % NON_AUDIO.length]
}

/**
 * 母题装饰（替代旧声波单一装饰）：同一品牌全物料共用同一族，
 * 换品牌即换族——装饰与品牌气质绑定，不再是通用音波符号。
 */
export function MotifDecor({
  width = 400,
  height = 24,
  color = 'currentColor',
  kind,
  brand,
}: {
  width?: number
  height?: number
  color?: string
  kind?: DecorKind
  brand: BrandSystem
}) {
  const k = kind ?? pickDecor(brand)
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      {k === 'wave' &&
        Array.from({ length: Math.floor(width / 10) }, (_, i) => {
          const h = 4 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6)) * (height - 6)
          return (
            <rect
              key={i}
              x={i * 10}
              y={(height - h) / 2}
              width="3.5"
              height={h}
              rx="1.75"
              fill={color}
              opacity={0.55 + Math.abs(Math.sin(i * 0.9)) * 0.45}
            />
          )
        })}
      {k === 'contour' &&
        Array.from({ length: Math.max(3, Math.floor(height / 9)) }, (_, i) => {
          const y = (i + 1) * (height / (Math.floor(height / 9) + 1))
          const a = height / 3
          return (
            <path
              key={i}
              d={`M 0 ${y} C ${width * 0.25} ${y - a}, ${width * 0.45} ${y + a}, ${width * 0.65} ${y} S ${width * 0.9} ${y - a}, ${width} ${y}`}
              stroke={color}
              strokeWidth="1.4"
              fill="none"
              opacity={0.35 + (i % 3) * 0.22}
            />
          )
        })}
      {k === 'dots' &&
        Array.from({ length: Math.floor(width / 16) }, (_, i) =>
          Array.from({ length: Math.max(2, Math.floor(height / 12)) }, (_, j) => {
            const r = 1.4 + Math.abs(Math.sin(i * 0.8 + j * 1.3)) * 2.4
            return (
              <circle
                key={`${i}-${j}`}
                cx={i * 16 + 8}
                cy={j * 12 + 6}
                r={r}
                fill={color}
                opacity={0.4 + Math.abs(Math.cos(i * 0.7 + j)) * 0.5}
              />
            )
          })
        )}
      {k === 'diagonal' &&
        Array.from({ length: Math.ceil(width / 18) + Math.ceil(height / 18) }, (_, i) => {
          const x = i * 18 - height
          return (
            <line
              key={i}
              x1={x}
              y1={height}
              x2={x + height}
              y2={0}
              stroke={color}
              strokeWidth={i % 4 === 0 ? 2.6 : 1.2}
              opacity={i % 4 === 0 ? 0.75 : 0.35}
            />
          )
        })}
      {k === 'arcs' &&
        Array.from({ length: 6 }, (_, i) => {
          const r = ((i + 1) / 6) * height
          const cx = width - height / 3
          const cy = height
          return (
            <path
              key={i}
              d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
              stroke={color}
              strokeWidth="1.6"
              fill="none"
              opacity={0.3 + (5 - i) * 0.13}
            />
          )
        })}
    </svg>
  )
}

/** 等高线装饰（背景肌理，保持原用途） */
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

/**
 * 程序化品牌图形标记：内部图形随母题族变化（声波条/等高线/网点/斜纹/同心弧），
 * 改 token 即换标——品牌标记与装饰体系同源。
 */
export function LogoMark({ size = 64, brand }: { size?: number; brand: BrandSystem }) {
  const { primary, accent, secondary } = brand.colors
  const k = pickDecor(brand)
  const u = size / 64
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-label="品牌图形标记">
      <rect x="2" y="2" width="60" height="60" rx="6" fill={primary} />
      {k === 'wave' && (
        <g stroke={accent} strokeWidth="3" strokeLinecap="round">
          <line x1="14" y1="27" x2="14" y2="37" />
          <line x1="22" y1="20" x2="22" y2="44" />
          <line x1="30" y1="25" x2="30" y2="39" />
        </g>
      )}
      {k === 'contour' && (
        <g stroke={accent} strokeWidth="2.4" fill="none">
          <path d="M 10 40 C 18 30, 26 46, 34 38 S 46 30, 52 40" />
          <path d="M 10 28 C 18 18, 26 34, 34 26 S 46 18, 52 28" opacity="0.6" />
        </g>
      )}
      {k === 'dots' && (
        <g fill={accent}>
          {[0, 1, 2].map((i) =>
            [0, 1, 2].map((j) => (
              <circle key={`${i}-${j}`} cx={16 + i * 16} cy={22 + j * 10} r={2 + (i === j ? 2.4 : 0)} opacity={i === j ? 1 : 0.55} />
            ))
          )}
        </g>
      )}
      {k === 'diagonal' && (
        <g stroke={accent} strokeWidth="3.2" strokeLinecap="round">
          <line x1="16" y1="42" x2="42" y2="18" />
          <line x1="24" y1="46" x2="46" y2="24" opacity="0.55" strokeWidth="2.4" />
        </g>
      )}
      {k === 'arcs' && (
        <g stroke={accent} strokeWidth="2.6" fill="none">
          <path d="M 16 46 A 16 16 0 0 1 48 46" />
          <path d="M 24 46 A 8 8 0 0 1 40 46" opacity="0.6" />
        </g>
      )}
      <g stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.92">
        <line x1={k === 'arcs' ? 38 : 38} y1="16" x2={k === 'arcs' ? 38 : 38} y2="48" />
        <line x1="46" y1="22" x2="46" y2="42" />
      </g>
      <circle cx="53" cy="32" r="3" fill={secondary} />
    </svg>
  )
}
