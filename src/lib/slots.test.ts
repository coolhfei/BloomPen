import { describe, expect, it } from 'vitest'
import { resolveSlot } from './slots'
import type { ProductImage } from './types'

const img = (id: string, opts: Partial<ProductImage> = {}): ProductImage => ({
  id,
  dataUrl: `data:image/png;base64,${id}`,
  mime: 'image/png',
  cutoutUrl: null,
  isMain: false,
  ...opts,
})

describe('resolveSlot · 主视觉位', () => {
  it('无图无生图 → procedural', () => {
    expect(resolveSlot([], null, 'hero')).toEqual({ mode: 'procedural' })
  })
  it('无图有生图 → hero（现状回归）', () => {
    expect(resolveSlot([], 'data:hero', 'hero')).toEqual({ mode: 'hero', src: 'data:hero' })
  })
  it('有图无透明底 → embed（即使有 AI 背景）', () => {
    expect(resolveSlot([img('a', { isMain: true })], 'data:hero', 'hero')).toEqual({
      mode: 'embed',
      src: 'data:image/png;base64,a',
    })
  })
  it('有透明底有 AI 背景 → composite + url 底', () => {
    expect(resolveSlot([img('a', { isMain: true, cutoutUrl: 'data:cut' })], 'data:hero', 'hero')).toEqual({
      mode: 'composite',
      bg: { kind: 'url', src: 'data:hero' },
      fg: 'data:cut',
    })
  })
  it('有透明底无 AI 背景 → composite + 程序化底', () => {
    expect(resolveSlot([img('a', { isMain: true, cutoutUrl: 'data:cut' })], null, 'hero')).toEqual({
      mode: 'composite',
      bg: { kind: 'procedural' },
      fg: 'data:cut',
    })
  })
  it('无 isMain 标记时取第一张', () => {
    expect(resolveSlot([img('a'), img('b')], null, 'hero')).toEqual({
      mode: 'embed',
      src: 'data:image/png;base64,a',
    })
  })
})

describe('resolveSlot · 内页图位', () => {
  it('取第 index 张非主图', () => {
    const products = [img('m', { isMain: true }), img('d1'), img('d2')]
    expect(resolveSlot(products, null, 'inline', 0)).toEqual({ mode: 'embed', src: 'data:image/png;base64,d1' })
    expect(resolveSlot(products, null, 'inline', 1)).toEqual({ mode: 'embed', src: 'data:image/png;base64,d2' })
  })
  it('图不够 → null（模板不渲染图位）', () => {
    expect(resolveSlot([img('m', { isMain: true })], null, 'inline', 0)).toBeNull()
    expect(resolveSlot([], null, 'inline', 0)).toBeNull()
  })
  it('内页永不 composite/hero（只 embed）', () => {
    const r = resolveSlot(
      [img('m', { isMain: true, cutoutUrl: 'x' }), img('d', { cutoutUrl: 'y' })],
      'data:hero',
      'inline',
      0
    )
    expect(r).toEqual({ mode: 'embed', src: 'data:image/png;base64,d' })
  })
})
