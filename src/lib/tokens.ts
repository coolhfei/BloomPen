import type { BrandSystem } from './types'
import { fontMenu } from './types'

/** 把任意字重吸附到该字体真实支持的字重上（防 faux bold 笔画糊团） */
export function snapWeight(w: number, available: readonly number[]): number {
  return available.reduce((best, cur) => (Math.abs(cur - w) < Math.abs(best - w) ? cur : best), available[0])
}

/**
 * brand.json → CSS 变量。
 * 所有物料模板只消费 CSS 变量，因此"改一处 token，全局重渲染"是工程必然。
 * 字重层级三档（强/主/柔）+ 结构标签字重（正文字体）：
 *   strong 给封面/海报大名等最大标题；main 给板块标题；soft 给宣言/引文；
 *   label 给页头/元信息（用正文字体，制造字体层级对比）。
 */
export function brandToVars(brand: BrandSystem): Record<string, string> {
  const menu = fontMenu(brand.fonts.display)
  const weights = menu?.weights ?? [400, 500, 700, 900]
  const main = snapWeight(brand.fonts.displayWeight, weights)
  const strong = weights[weights.length - 1]
  const soft = snapWeight(Math.min(main, 500), weights)

  return {
    '--brand-primary': brand.colors.primary,
    '--brand-secondary': brand.colors.secondary,
    '--brand-accent': brand.colors.accent,
    '--brand-ink': brand.colors.ink,
    '--brand-paper': brand.colors.paper,
    '--brand-muted': brand.colors.muted,
    '--font-display': `"${brand.fonts.display}", "Noto Serif SC", serif`,
    '--font-body': `"${brand.fonts.body}", "Noto Sans SC", sans-serif`,
    '--font-display-weight': String(main),
    '--font-display-weight-strong': String(strong),
    '--font-display-weight-soft': String(soft),
    '--font-label-weight': '600',
  }
}

export function applyBrand(brand: BrandSystem, el: HTMLElement = document.documentElement): void {
  const vars = brandToVars(brand)
  for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v)
}

/** 色值工具：明暗/饱和度调整，供快捷色板与预览使用 */
export function hexToHsl(hex: string): [number, number, number] {
  const m = hex.replace('#', '')
  const r = parseInt(m.slice(0, 2), 16) / 255
  const g = parseInt(m.slice(2, 4), 16) / 255
  const b = parseInt(m.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  return [h * 360, s * 100, l * 100]
}

export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360
  s = Math.min(100, Math.max(0, s)) / 100
  l = Math.min(100, Math.max(0, l)) / 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let [r, g, b] = [0, 0, 0]
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

export function shift(hex: string, dh: number, ds: number, dl: number): string {
  const [h, s, l] = hexToHsl(hex)
  return hslToHex(h + dh, s + ds, l + dl)
}
