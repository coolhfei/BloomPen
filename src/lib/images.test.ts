import { describe, expect, it } from 'vitest'
import { findTransparentPixel, mayHaveAlpha } from './images'

const rgba = (n: number, alpha: (i: number) => number): Uint8ClampedArray => {
  const arr = new Uint8ClampedArray(n * 4)
  for (let i = 0; i < n; i++) {
    arr[i * 4] = 128
    arr[i * 4 + 1] = 128
    arr[i * 4 + 2] = 128
    arr[i * 4 + 3] = alpha(i)
  }
  return arr
}

describe('mayHaveAlpha', () => {
  it('PNG/WebP 可能带透明通道', () => {
    expect(mayHaveAlpha('image/png')).toBe(true)
    expect(mayHaveAlpha('image/webp')).toBe(true)
  })
  it('JPEG 不可能带透明通道', () => {
    expect(mayHaveAlpha('image/jpeg')).toBe(false)
  })
})

describe('findTransparentPixel', () => {
  it('全不透明 → false', () => {
    expect(findTransparentPixel(rgba(64, () => 255))).toBe(false)
  })
  it('采样点命中透明像素 → true', () => {
    // 采样序列为像素 0, 16, 32…（alpha 下标 3 + k*64），把第 16 个像素置透明
    expect(findTransparentPixel(rgba(64, (i) => (i === 16 ? 0 : 255)))).toBe(true)
  })
  it('半透明（alpha<250）也算透明', () => {
    expect(findTransparentPixel(rgba(32, (i) => (i === 0 ? 200 : 255)))).toBe(true)
  })
})
