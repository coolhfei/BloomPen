import { chatJSON, chatText } from './providers/llm'
import { generateHero } from './providers/image'
import { parseJSONLoose } from './json'
import { checkCopy, sanitizeCopy } from './copyqc'
import {
  applyPatch,
  BRIEF_OPTIMIZER_PROMPT,
  BRAND_SYSTEM_PROMPT,
  buildBriefOptimizerUserPrompt,
  buildBrandUserPrompt,
  buildCopyUserPrompt,
  buildDataPointsUserPrompt,
  buildPatchUserPrompt,
  clampPatchColors,
  COPY_PROMPT,
  DATAPOINTS_PROMPT,
  PATCH_SYSTEM_PROMPT,
} from './prompts'
import { snapWeight } from './tokens'
import type { AppSettings } from './providers/types'
import { fontMenu } from './types'
import type { AgentEvent, AgentId, BrandPatch, BrandSystem, CopyBundle, GenResult } from './types'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export type Emit = (e: AgentEvent) => void

/** 简报 AI 优化：把直白凌乱的描述升级为结构完整的品牌简报 */
export async function optimizeBrief(raw: string, settings: AppSettings): Promise<string> {
  const text = await chatText(
    settings.llm,
    BRIEF_OPTIMIZER_PROMPT,
    buildBriefOptimizerUserPrompt(raw),
    0.7
  )
  return text.replace(/^["「『]|["」』]$/g, '').trim()
}

// ── 可独立触发的生成单元（供整体管线与"局部重生成"共用）──────────

/** 品牌系统 Agent：简报 → brand.json */
export async function genBrand(brief: string, llm: AppSettings['llm'], emit: Emit): Promise<BrandSystem> {
  emit({ agent: 'brand', type: 'status', status: 'running' })
  emit({ agent: 'brand', type: 'log', message: '解析品牌简报…' })
  const brand = await chatJSON<BrandSystem>(llm, BRAND_SYSTEM_PROMPT, buildBrandUserPrompt(brief), 0.85)
  validateBrand(brand)
  emit({ agent: 'brand', type: 'log', message: `锁定视觉系统 · 主色 ${brand.colors.primary} · ${brand.slogan.zh}` })
  emit({ agent: 'brand', type: 'status', status: 'done' })
  return brand
}

/** 文案 Agent：简报 + 品牌系统 → 文案包（含质检重写与数据钩子兜底） */
export async function genCopy(brief: string, brand: BrandSystem, llm: AppSettings['llm'], emit: Emit): Promise<CopyBundle> {
  emit({ agent: 'copy', type: 'status', status: 'running' })
  emit({ agent: 'copy', type: 'log', message: '按品牌语气撰写中英文文案…' })
  const rawCopy = await chatJSON<CopyBundle>(llm, COPY_PROMPT, buildCopyUserPrompt(brief, brand), 0.9)
  validateCopy(rawCopy)
  let copy = sanitizeCopy(rawCopy)

  const violations = checkCopy(copy)
  if (violations.length > 0) {
    emit({ agent: 'copy', type: 'log', message: `质检命中 ${violations.length} 处，自动重写…` })
    try {
      const retry = await chatJSON<CopyBundle>(
        llm,
        COPY_PROMPT,
        buildCopyUserPrompt(brief, brand) +
          `\n\n上次产出的违例清单（本次必须全部规避）：\n${violations.map((v) => `- ${v.field}：${v.issue}`).join('\n')}`,
        0.7
      )
      validateCopy(retry)
      const retryClean = sanitizeCopy(retry)
      if (checkCopy(retryClean).length <= violations.length) copy = retryClean
    } catch {
      emit({ agent: 'copy', type: 'log', message: '重写失败，沿用清洗后版本' })
    }
  } else {
    emit({ agent: 'copy', type: 'log', message: '文案质检通过' })
  }

  if (!copy.dataPoints?.length) {
    try {
      emit({ agent: 'copy', type: 'log', message: '补全品牌数据钩子…' })
      const dp = await chatJSON<{ dataPoints: { value: string; label: string }[] }>(
        llm,
        DATAPOINTS_PROMPT,
        buildDataPointsUserPrompt(brand, copy),
        0.5
      )
      copy.dataPoints = (dp.dataPoints ?? []).slice(0, 3)
    } catch {
      copy.dataPoints = []
    }
  }
  emit({
    agent: 'copy',
    type: 'log',
    message: `文案就绪 · ${copy.pillars.length} 大内容板块 · ${copy.programs.length} 档节目`,
  })
  emit({ agent: 'copy', type: 'status', status: 'done' })
  return copy
}

/** 主视觉 Agent：品牌系统 → 英雄图（失败返回 null，程序化视觉兜底） */
export async function genHero(image: AppSettings['image'], brand: BrandSystem, emit: Emit): Promise<string | null> {
  emit({ agent: 'visual', type: 'status', status: 'running' })
  emit({ agent: 'visual', type: 'log', message: image.kind === 'none' ? '生图已关闭 · 使用程序化视觉' : '构造主视觉提示词…' })
  if (image.kind === 'none') {
    emit({ agent: 'visual', type: 'status', status: 'done' })
    return null
  }
  try {
    const hero = await generateHero(image, brand.heroPrompt, (msg) => emit({ agent: 'visual', type: 'log', message: msg }))
    emit({ agent: 'visual', type: 'log', message: '主视觉生成完成' })
    emit({ agent: 'visual', type: 'status', status: 'done' })
    return hero
  } catch (e) {
    emit({ agent: 'visual', type: 'error', message: `生图失败，使用程序化视觉兜底：${(e as Error).message}` })
    return null
  }
}

/**
 * 编排管线（模型无关）：
 *   brand ──┬─→ copy ──┬─→ layout
 *           └─→ visual ┴─→ social
 * brand 完成后，copy（LLM）与 visual（生图适配器）并行发起；
 * layout 只依赖 copy（程序化渲染）；social 等 copy + visual。
 */
export async function runPipeline(brief: string, emit: Emit, settings: AppSettings): Promise<GenResult> {
  // ── 1. 品牌系统 ──
  const brand = await genBrand(brief, settings.llm, emit)

  // ── 2. 文案 ∥ 主视觉 并行 ──
  const copyPromise = genCopy(brief, brand, settings.llm, emit)
  const visualPromise = genHero(settings.image, brand, emit)

  // ── 3. 版式（等文案）──
  emit({ agent: 'layout', type: 'status', status: 'running' })
  emit({ agent: 'layout', type: 'log', message: '等待文案注入版式网格…' })
  const copy = await copyPromise
  await sleep(600)
  emit({ agent: 'layout', type: 'log', message: '宣传册 5 页排版完成 · 封面 / 简介 / 内容矩阵 / 排期 / 封底' })
  emit({ agent: 'layout', type: 'status', status: 'done' })

  // ── 4. 社媒（等文案 + 主视觉）──
  emit({ agent: 'social', type: 'status', status: 'running' })
  emit({ agent: 'social', type: 'log', message: '等待主视觉合成…' })
  const hero = await visualPromise
  emit({ agent: 'social', type: 'log', message: '输出 1:1 引用卡 · 3:4 节目卡 · 16:9 Banner' })
  await sleep(400)
  emit({ agent: 'social', type: 'status', status: 'done' })

  return { brief, brand, copy, heroUrl: hero, savedAt: Date.now() }
}

/** 框选编辑：自然语言 → token 补丁 → 新品牌系统 */
export async function editBrandTokens(
  instruction: string,
  brand: BrandSystem,
  selectedText: string,
  settings: AppSettings
): Promise<{ patch: BrandPatch; next: BrandSystem; explain: string }> {
  const rawPatch = await chatJSON<BrandPatch>(
    settings.llm,
    PATCH_SYSTEM_PROMPT,
    buildPatchUserPrompt(instruction, brand, selectedText),
    0.3
  )
  const patch = clampPatchColors(rawPatch, brand, instruction)
  const next = applyPatch(brand, patch)
  const changed: string[] = []
  if (patch.colors) for (const k of Object.keys(patch.colors)) changed.push(`colors.${k}`)
  if (patch.fonts) for (const k of Object.keys(patch.fonts)) changed.push(`fonts.${k}`)
  if (patch.slogan) for (const k of Object.keys(patch.slogan)) changed.push(`slogan.${k}`)
  if (patch.tone) changed.push('tone')
  if (patch.motifs) changed.push('motifs')
  return { patch, next, explain: changed.length ? `已修改 ${changed.join('、')}` : '未识别到可修改的 token' }
}

// ── 校验与兜底 ─────────────────────────────────────

function validateBrand(b: BrandSystem): void {
  const hex = /^#[0-9a-fA-F]{6}$/
  if (!b?.brandName || !b?.colors || !b?.fonts || !b?.slogan) throw new Error('品牌系统 JSON 结构不完整')
  for (const [k, v] of Object.entries(b.colors)) {
    if (!hex.test(v)) throw new Error(`colors.${k} 不是合法色值: ${v}`)
  }
  if (typeof b.fonts.displayWeight === 'string') b.fonts.displayWeight = Number(b.fonts.displayWeight) || 700
  // 吸附到字体真实支持的字重，防 faux bold（单字重字体只能 400）
  const menu = fontMenu(b.fonts.display)
  if (menu) b.fonts.displayWeight = snapWeight(b.fonts.displayWeight, menu.weights)
}

function validateCopy(c: CopyBundle): void {
  if (!c?.intro || !Array.isArray(c?.pillars) || !Array.isArray(c?.programs)) {
    throw new Error('文案包 JSON 结构不完整')
  }
  c.pillars = c.pillars.slice(0, 3)
  c.programs = c.programs.slice(0, 4)
  c.quotes = (c.quotes ?? []).slice(0, 2)
  c.dataPoints = (c.dataPoints ?? []).slice(0, 3)
  c.socialCaptions = (c.socialCaptions ?? []).slice(0, 3)
  c.manifesto = (c.manifesto ?? []).slice(0, 3)
}

export { parseJSONLoose }
