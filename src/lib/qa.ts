/** 视觉质检（QA 拦截）：像素分析 + 文案充实度 + 色差，全部纯函数可单测 */
import type { CopyBundle } from './types'

export type QaCode =
  | 'layout-gap'
  | 'sparse-coverage'
  | 'img-broken'
  | 'img-lowres'
  | 'hero-procedural'
  | 'text-dense'
  | 'hero-color-drift'
  | 'copy-thin'

export type QaSeverity = 'info' | 'warn' | 'error'

export interface QaRect {
  x: number
  y: number
  w: number
  h: number
}

export interface QaIssue {
  /** 物料面 id（brochure-2 / poster / program…）或 '主视觉' */
  material: string
  tab: string
  code: QaCode
  severity: QaSeverity
  message: string
  /** 问题区域（物料原生坐标），可空 */
  rect?: QaRect
}

export interface QaReport {
  issues: QaIssue[]
  ranAt: number
}

/** 规则阈值（集中可调；已经真实物料校准：富文案页面 gap 0.03~0.21 属正常设计留白） */
export const QA_RULES = {
  bgTolerance: 28,
  /** 最大垂直空白段占面高比：>0.28 警告，>0.40 视为版面断层 */
  warnGap: 0.28,
  errorGap: 0.4,
  /** 覆盖率低于此值 = 版面几乎为空（渲染失败级） */
  nearEmptyCoverage: 0.025,
  lowresRatio: 0.9,
  /** ΔE 超此值 → info（试验性，勿随意调低） */
  deltaEInfo: 55,
  /** 文案充实度（真实文案校准：正常 intro 49~120 字、desc 均值 25+） */
  thinIntro: 40,
  thinDescAvg: 15,
} as const

export interface QaSurface {
  id: string
  tab: string
  w: number
  h: number
  /** 离屏容器与舞台中通用的定位选择器 */
  selector: string
  /** 同 selector 多实例下标（宣传册页） */
  nth?: number
  /** 豁免空白段检查（封底等天然极简的面） */
  skipGap?: boolean
}

/** 检测面清单（10 面）；封底天然极简 → 降低覆盖要求且豁免底部留白 */
export const QA_SURFACES: QaSurface[] = [
  { id: 'brochure-1', tab: 'brochure', w: 794, h: 1123, selector: '.bf-page', nth: 0 },
  { id: 'brochure-2', tab: 'brochure', w: 794, h: 1123, selector: '.bf-page', nth: 1 },
  { id: 'brochure-3', tab: 'brochure', w: 794, h: 1123, selector: '.bf-page', nth: 2 },
  { id: 'brochure-4', tab: 'brochure', w: 794, h: 1123, selector: '.bf-page', nth: 3 },
  { id: 'brochure-5', tab: 'brochure', w: 794, h: 1123, selector: '.bf-page', nth: 4, skipGap: true },
  { id: 'poster', tab: 'poster', w: 800, h: 1200, selector: '.bf-poster' },
  { id: 'quote', tab: 'social', w: 1080, h: 1080, selector: '.bf-quote-card' },
  { id: 'program', tab: 'social', w: 1080, h: 1440, selector: '.bf-program-card' },
  { id: 'banner', tab: 'social', w: 1920, h: 1080, selector: '.bf-banner' },
  { id: 'rollup', tab: 'rollup', w: 480, h: 1200, selector: '.bf-rollup' },
]

/** 在任意容器内定位物料面（离屏容器与舞台通用） */
export function findSurfaceEl(host: HTMLElement, s: QaSurface): HTMLElement | null {
  if (s.nth != null) return host.querySelectorAll<HTMLElement>(s.selector)[s.nth] ?? null
  return host.querySelector<HTMLElement>(s.selector)
}

// ── 像素分析 ─────────────────────────────────────

export interface PixelStats {
  coverage: number
  /** 最大垂直空白段占面高比（任意位置，不只底部——宣传册有固定页脚，底部空带无判别力） */
  largestGapRatio: number
  /** 最大空白段矩形（原生坐标） */
  gapRect?: QaRect
}

/** 边缘 2px 众数法估计背景色（RGB 各 32 级量化分桶，抗渐变/噪声） */
export function estimateBgColor(pixels: Uint8ClampedArray, w: number, h: number): [number, number, number] {
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>()
  const push = (x: number, y: number) => {
    const i = (y * w + x) * 4
    const r = pixels[i]
    const g = pixels[i + 1]
    const b = pixels[i + 2]
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)
    const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }
    e.n++
    e.r += r
    e.g += g
    e.b += b
    buckets.set(key, e)
  }
  for (let x = 0; x < w; x++) {
    push(x, 0)
    push(x, 1)
    push(x, h - 1)
    push(x, h - 2)
  }
  for (let y = 2; y < h - 2; y++) {
    push(0, y)
    push(1, y)
    push(w - 1, y)
    push(w - 2, y)
  }
  let best = { n: 0, r: 255, g: 255, b: 255 }
  for (const e of buckets.values()) if (e.n > best.n) best = e
  return [Math.round(best.r / best.n), Math.round(best.g / best.n), Math.round(best.b / best.n)]
}

/** 像素体检：内容覆盖率 + 最大垂直空白段（gapRect 已换算原生坐标） */
export function analyzePixels(pixels: Uint8ClampedArray, w: number, h: number, nativeW = w, nativeH = h): PixelStats {
  const [br, bg, bb] = estimateBgColor(pixels, w, h)
  const tol = QA_RULES.bgTolerance
  let content = 0
  const rowEmpty = new Array<boolean>(h)
  for (let y = 0; y < h; y++) {
    let rowHas = false
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const dr = pixels[i] - br
      const dg = pixels[i + 1] - bg
      const db = pixels[i + 2] - bb
      if (Math.sqrt(dr * dr + dg * dg + db * db) > tol) {
        content++
        rowHas = true
      }
    }
    rowEmpty[y] = !rowHas
  }
  // 最大连续空行段（含位置）
  let maxGap = 0
  let gapStart = 0
  let cur = 0
  let curStart = 0
  for (let y = 0; y < h; y++) {
    if (rowEmpty[y]) {
      if (cur === 0) curStart = y
      cur++
      if (cur > maxGap) {
        maxGap = cur
        gapStart = curStart
      }
    } else {
      cur = 0
    }
  }
  const scaleX = nativeW / w
  const scaleY = nativeH / h
  return {
    coverage: content / (w * h),
    largestGapRatio: maxGap / h,
    ...(maxGap > 0
      ? { gapRect: { x: 0, y: Math.round(gapStart * scaleY), w: nativeW, h: Math.round(maxGap * scaleY) } }
      : {}),
  }
}

// ── 色差（ΔE76，试验性） ──────────────────────────

export function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '')
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)]
}

export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const f = (c: number) => {
    c /= 255
    return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92
  }
  const R = f(r)
  const G = f(g)
  const B = f(b)
  const X = R * 0.4124 + G * 0.3576 + B * 0.1805
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722
  const Z = R * 0.0193 + G * 0.1192 + B * 0.9505
  const t = (v: number) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116)
  const fx = t(X / 0.95047)
  const fy = t(Y)
  const fz = t(Z / 1.08883)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

export function deltaE76(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2)
}

/** 像素缓冲平均色（跳过近全透明像素） */
export function meanColor(pixels: Uint8ClampedArray): [number, number, number] {
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue
    r += pixels[i]
    g += pixels[i + 1]
    b += pixels[i + 2]
    n++
  }
  return n ? [r / n, g / n, b / n] : [255, 255, 255]
}

// ── 文案充实度（自动打回判定用） ─────────────────────

export function copyStats(copy: CopyBundle): { introLen: number; descAvg: number; thin: boolean } {
  const introLen = (copy.intro ?? '').trim().length
  const descs = (copy.pillars ?? []).map((p) => p.desc ?? '')
  const descAvg = descs.length ? descs.reduce((n, d) => n + d.length, 0) / descs.length : 0
  return { introLen, descAvg, thin: introLen < QA_RULES.thinIntro || descAvg < QA_RULES.thinDescAvg }
}
