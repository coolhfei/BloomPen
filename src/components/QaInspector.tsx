import { useEffect, useRef } from 'react'
import { toCanvas } from 'html-to-image'
import {
  analyzePixels,
  copyStats,
  deltaE76,
  findSurfaceEl,
  hexToRgb,
  meanColor,
  QA_RULES,
  QA_SURFACES,
  rgbToLab,
  type QaIssue,
  type QaReport,
  type QaSurface,
} from '../lib/qa'
import { resolveSlot } from '../lib/slots'
import type { GenResult } from '../lib/types'
import { Brochure } from './Brochure'
import { Poster } from './Poster'
import { BannerCard, ProgramCard, QuoteCard } from './Social'
import { RollupBanner } from './RollupBanner'

const RASTER_W = 256
const IMG_WAIT_MS = 5000
/** 承载主视觉槽位的物料面 */
const HERO_SURFACES = new Set(['brochure-1', 'poster', 'program', 'rollup'])

interface Props {
  result: GenResult
  onReport: (r: QaReport) => void
}

/** 离屏渲染全部物料面 → 低分辨率光栅化 + DOM 检查 → QA 报告（只测量，不参与展示与导出） */
export function QaInspector({ result, onReport }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const timer = useRef(0)
  const runId = useRef(0)

  useEffect(() => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void inspect(), 400)
    return () => window.clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result])

  async function inspect() {
    const host = hostRef.current
    if (!host) return
    const id = ++runId.current
    await imagesReady(host)
    if (id !== runId.current) return

    const { brand, copy, heroUrl, products } = result
    const issues: QaIssue[] = []

    for (const s of QA_SURFACES) {
      const node = findSurfaceEl(host, s)
      if (!node) continue
      try {
        issues.push(...(await pixelChecks(node, s)))
      } catch {
        console.warn(`[qa] ${s.id} 光栅化失败，仅保留 DOM 检查`)
      }
      issues.push(...domChecks(node, s))
      if (HERO_SURFACES.has(s.id)) {
        const hero = s.id === 'rollup' ? (result.rollupHeroUrl ?? heroUrl) : heroUrl
        if (resolveSlot(products, hero, 'hero')?.mode === 'procedural') {
          issues.push({ material: s.id, tab: s.tab, code: 'hero-procedural', severity: 'info', message: '主视觉为程序化图形（配生图或上传商品图可升级）' })
        }
      }
      if (id !== runId.current) return
    }

    issues.push(...colorDriftChecks(host, result))
    // 文案充实度（数据源直接判定，比像素可靠）
    if (copyStats(copy).thin)
      issues.push({ material: '文案', tab: 'brochure', code: 'copy-thin', severity: 'info', message: '文案信息量偏少，版面可能偏空（可点文案 Agent ↻ 重写）' })
    if (id !== runId.current) return
    onReport({ issues, ranAt: Date.now() })
  }

  const { brand, copy, heroUrl, products } = result
  return (
    <div ref={hostRef} className="qa-host" aria-hidden="true">
      <Brochure brand={brand} copy={copy} heroUrl={heroUrl} products={products} />
      <Poster brand={brand} copy={copy} heroUrl={heroUrl} products={products} />
      <QuoteCard brand={brand} copy={copy} heroUrl={heroUrl} products={products} />
      <ProgramCard brand={brand} copy={copy} heroUrl={heroUrl} products={products} />
      <BannerCard brand={brand} copy={copy} heroUrl={heroUrl} products={products} />
      <RollupBanner brand={brand} copy={copy} heroUrl={result.rollupHeroUrl ?? heroUrl} products={products} />
    </div>
  )
}

// ── 内部工具 ─────────────────────────────────────

async function imagesReady(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll('img'))
  await Promise.race([
    Promise.all(
      imgs.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((res) => {
              img.addEventListener('load', () => res(), { once: true })
              img.addEventListener('error', () => res(), { once: true })
            })
      )
    ),
    new Promise<void>((res) => setTimeout(res, IMG_WAIT_MS)),
  ])
}

async function pixelChecks(node: HTMLElement, s: QaSurface): Promise<QaIssue[]> {
  const canvas = await toCanvas(node, {
    canvasWidth: RASTER_W,
    canvasHeight: Math.round((RASTER_W / s.w) * s.h),
    pixelRatio: 1,
  })
  const ctx = canvas.getContext('2d')!
  const stats = analyzePixels(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, s.w, s.h)
  const issues: QaIssue[] = []
  // 版面几乎为空 = 渲染失败级
  if (stats.coverage < QA_RULES.nearEmptyCoverage)
    issues.push({ material: s.id, tab: s.tab, code: 'sparse-coverage', severity: 'error', message: `版面几乎为空（覆盖率 ${Math.round(stats.coverage * 100)}%）` })
  // 最大垂直空白段（设计留白基线：正常物料 0.03~0.21）
  if (!s.skipGap && stats.largestGapRatio > QA_RULES.errorGap)
    issues.push({ material: s.id, tab: s.tab, code: 'layout-gap', severity: 'error', message: `版面断层：最大空白段 ${Math.round(stats.largestGapRatio * 100)}%（版面偏空）`, rect: stats.gapRect })
  else if (!s.skipGap && stats.largestGapRatio > QA_RULES.warnGap)
    issues.push({ material: s.id, tab: s.tab, code: 'layout-gap', severity: 'warn', message: `最大空白段 ${Math.round(stats.largestGapRatio * 100)}%`, rect: stats.gapRect })
  return issues
}

function domChecks(node: HTMLElement, s: QaSurface): QaIssue[] {
  const issues: QaIssue[] = []
  let worst: { ratio: number; nat: number; need: number } | null = null
  for (const img of Array.from(node.querySelectorAll('img'))) {
    if (img.naturalWidth === 0) {
      issues.push({ material: s.id, tab: s.tab, code: 'img-broken', severity: 'error', message: '图片加载失败' })
      continue
    }
    const boxW = img.getBoundingClientRect().width
    if (boxW > 120 && img.naturalWidth < boxW * QA_RULES.lowresRatio) {
      const ratio = img.naturalWidth / boxW
      if (!worst || ratio < worst.ratio) worst = { ratio, nat: img.naturalWidth, need: Math.round(boxW) }
    }
  }
  if (worst) issues.push({ material: s.id, tab: s.tab, code: 'img-lowres', severity: 'warn', message: `图片导出欠采样（实际 ${worst.nat}px，需 ≥${worst.need}px）` })
  if (node.querySelectorAll('.t-l').length >= 2)
    issues.push({ material: s.id, tab: s.tab, code: 'text-dense', severity: 'info', message: '文字密度偏高，可框选精简' })
  return issues
}

/** ΔE 色差（试验性 info）：仅 AI 场景背景图，按 URL 去重 */
function colorDriftChecks(host: HTMLElement, result: GenResult): QaIssue[] {
  const urls = new Map<string, string>()
  const heroSlot = resolveSlot(result.products, result.heroUrl, 'hero')
  let heroSrc: string | null = null
  if (heroSlot) {
    if (heroSlot.mode === 'hero') heroSrc = heroSlot.src
    else if (heroSlot.mode === 'composite' && heroSlot.bg.kind === 'url') heroSrc = heroSlot.bg.src
  }
  if (heroSrc) urls.set(heroSrc, 'poster')
  if (result.rollupHeroUrl && result.rollupHeroUrl !== heroSrc) urls.set(result.rollupHeroUrl, 'rollup')

  const issues: QaIssue[] = []
  const brandLab = rgbToLab(...hexToRgb(result.brand.colors.primary))
  for (const [url, tab] of urls) {
    const img = Array.from(host.querySelectorAll('img')).find((i) => i.src === url)
    if (!img) continue
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 64
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, 64, 64)
      const mean = meanColor(ctx.getImageData(0, 0, 64, 64).data)
      const delta = deltaE76(rgbToLab(...mean), brandLab)
      if (delta > QA_RULES.deltaEInfo)
        issues.push({ material: '主视觉', tab, code: 'hero-color-drift', severity: 'info', message: `主图主色与品牌主色偏差较大（ΔE ${Math.round(delta)}）· 试验性提示` })
    } catch {
      /* 采样失败跳过 */
    }
  }
  return issues
}
