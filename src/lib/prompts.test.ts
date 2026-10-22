import { describe, expect, it } from 'vitest'
import { heroScenePrompt, SCENE_ONLY_SUFFIX } from './prompts'

describe('heroScenePrompt', () => {
  it('sceneOnly=false 原样返回', () => {
    expect(heroScenePrompt('一杯咖啡', false)).toBe('一杯咖啡')
  })
  it('sceneOnly=true 追加禁商品主体约束', () => {
    const out = heroScenePrompt('一杯咖啡', true)
    expect(out).toContain('一杯咖啡')
    expect(out).toContain(SCENE_ONLY_SUFFIX)
    expect(out).toContain('不出现任何商品')
  })
})
