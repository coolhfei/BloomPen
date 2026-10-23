import { describe, expect, it } from 'vitest'
import { analyzePixels, copyStats, deltaE76, hexToRgb, rgbToLab } from './qa'
import type { CopyBundle } from './types'

type RGB = [number, number, number]
const WHITE: RGB = [255, 255, 255]
const DARK: RGB = [30, 30, 30]

function makePixels(w: number, h: number, fill: (x: number, y: number) => RGB): Uint8ClampedArray {
  const px = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [r, g, b] = fill(x, y)
      const i = (y * w + x) * 4
      px[i] = r
      px[i + 1] = g
      px[i + 2] = b
      px[i + 3] = 255
    }
  return px
}

describe('analyzePixels', () => {
  it('全背景：coverage=0，最大空白段=整页（原生坐标）', () => {
    const s = analyzePixels(makePixels(64, 64, () => WHITE), 64, 64, 640, 640)
    expect(s.coverage).toBe(0)
    expect(s.largestGapRatio).toBe(1)
    expect(s.gapRect).toEqual({ x: 0, y: 0, w: 640, h: 640 })
  })
  it('上 60% 中央有内容、下 40% 全空 → gap≈0.4 且 rect 换算正确', () => {
    const px = makePixels(100, 100, (x, y) => (y < 60 && x > 20 && x < 80 ? DARK : WHITE))
    const s = analyzePixels(px, 100, 100, 1000, 1000)
    expect(s.largestGapRatio).toBeCloseTo(0.4, 2)
    expect(s.coverage).toBeCloseTo(0.35, 2)
    expect(s.gapRect).toEqual({ x: 0, y: 600, w: 1000, h: 400 })
  })
  it('内部断层（上下有内容，中间空 40%）→ gap 定位在中部', () => {
    const px = makePixels(100, 100, (x, y) => ((y < 30 || y >= 70) && x > 20 && x < 80 ? DARK : WHITE))
    const s = analyzePixels(px, 100, 100, 1000, 1000)
    expect(s.largestGapRatio).toBeCloseTo(0.4, 2)
    expect(s.gapRect).toEqual({ x: 0, y: 300, w: 1000, h: 400 })
  })
  it('背景容差内的微噪声不误报为内容', () => {
    let seed = 7
    const px = makePixels(64, 64, () => {
      seed = (seed * 16807) % 2147483647
      const n = seed % 17 // 0..16，距白色 ≤16，RGB 距离 ≤27.7 < 容差 28
      return [255 - n, 255 - n, 255 - n]
    })
    const s = analyzePixels(px, 64, 64)
    expect(s.coverage).toBe(0)
    expect(s.largestGapRatio).toBe(1)
  })
  it('内容触底、顶部留白 → gap 在顶部', () => {
    const px = makePixels(100, 100, (x, y) => (y > 10 && x > 20 && x < 80 ? DARK : WHITE))
    const s = analyzePixels(px, 100, 100)
    expect(s.largestGapRatio).toBeCloseTo(0.11, 2)
    expect(s.gapRect).toEqual({ x: 0, y: 0, w: 100, h: 11 })
  })
})

describe('色差（ΔE76）', () => {
  it('同色 ΔE = 0', () => {
    const lab = rgbToLab(31, 77, 62)
    expect(deltaE76(lab, lab)).toBe(0)
  })
  it('白色 Lab ≈ (100, 0, 0)', () => {
    const [l] = rgbToLab(255, 255, 255)
    expect(l).toBeCloseTo(100, 0)
  })
  it('白 vs 黑 ΔE ≈ 100', () => {
    expect(deltaE76(rgbToLab(255, 255, 255), rgbToLab(0, 0, 0))).toBeCloseTo(100, 0)
  })
  it('hexToRgb 解析', () => {
    expect(hexToRgb('#1F4D3E')).toEqual([31, 77, 62])
  })
})

describe('copyStats', () => {
  const copy = (intro: string, desc: string): CopyBundle => ({
    intro,
    manifesto: [],
    pillars: [{ tag: 'a', title: 'b', desc }],
    quotes: [],
    dataPoints: [],
    programs: [],
    cta: { headline: '', sub: '' },
    socialCaptions: [],
  })
  it('短文案 → thin', () => {
    expect(copyStats(copy('很短', '也短')).thin).toBe(true)
  })
  it('充实文案 → 不 thin', () => {
    const long = '这是一段足够长的简介文案，用来通过充实度判定，需要超过七十个字符才算数，所以继续补充一些有意义的内容，把品牌的理念、场景与价值主张都讲清楚，直到达标为止。'
    const desc = '板块描述也需要足够长，超过二十二个字符的平均线才行。'
    expect(copyStats(copy(long, desc)).thin).toBe(false)
  })
})
