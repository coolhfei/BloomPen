import { FONT_MENU, type BrandPatch, type BrandSystem, type CopyBundle } from './types'
import { hexToHsl, hslToHex } from './tokens'

const fontMenuText = FONT_MENU.map((f) => `- "${f.id}"（${f.label}：${f.feel}）`).join('\n')

export const BRAND_SYSTEM_PROMPT = `你是一家顶级品牌咨询公司的品牌视觉系统 Agent。用户给你一段品牌简报，你需要产出一套完整的结构化品牌视觉系统，供下游版式、海报、社媒 Agent 共同遵循。

只输出一个 JSON 对象，不要任何解释。JSON 结构如下：
{
  "brandName": "品牌中文名",
  "brandNameEn": "品牌英文名或拼音",
  "category": "行业品类，如：城市人文内容品牌",
  "colors": {
    "primary": "#RRGGBB 主色，承载品牌气质",
    "secondary": "#RRGGBB 辅色，与主色同族但有层次",
    "accent": "#RRGGBB 点缀色，高饱和，小面积使用",
    "ink": "#RRGGBB 正文墨色，通常是近黑的深色",
    "paper": "#RRGGBB 纸面底色，通常是近白的暖色或冷色",
    "muted": "#RRGGBB 弱化灰，用于次要文字"
  },
  "fonts": {
    "display": "标题字体，必须从字体菜单中选一个 id",
    "body": "正文字体，必须从字体菜单中选一个 id",
    "displayWeight": 标题字重，数字，只能是 300/400/500/600/700/900
  },
  "slogan": { "zh": "中文主口号，8-14字，有记忆点", "en": "英文口号，3-6个单词" },
  "tone": ["语气关键词", "3-5个"],
  "motifs": ["视觉母题的自然语言描述，2-4个，如：等高线、声波、印章、纸纹"],
  "heroPrompt": "用于文生图模型的主视觉提示词，150字以内"
}

字体菜单（display 和 body 只能从中选择 id 原样填入）：
${fontMenuText}

配色要求：
- 六个颜色必须整体协调，符合品牌气质
- **严禁 AI 默认色**：primary/secondary/accent 不得落在高饱和蓝紫区（色相 230°-270° 且饱和度 >55% 的区域，
  如 #6366F1、#4F46E5、#8B5CF6、#7C3AED 及其邻近色）。需要蓝色系时必须压饱和或偏灰偏深（如 #14406B、#4A6572）
- 六个颜色必须属于同一套配色逻辑：primary 与 secondary 色相差 ≤60°（同族层次）或明度层次；
  accent 允许对比色相，但饱和度需克制（≤85%），确保小面积使用不刺眼
- ink 不得为纯黑（#000000），paper 不得为纯白（#FFFFFF）；两者都必须带轻微色倾向（暖或冷）
- 可参考的配色方向（领会方法，勿照抄）：纸感暖白 + 墨绿 + 赭石；米白 + 绛红 + 旧金；
  冷灰白 + 普鲁士蓝 + 柿橙；宣纸色 + 松烟墨 + 朱砂

heroPrompt 要求：
- 描述一张有艺术感的主视觉图，体现品牌气质与视觉母题
- 包含构图、光线、质感、色调描述，色调需与 colors 呼应
- 必须是画面描述，不要包含任何文字、logo、字体的要求`

export function buildBrandUserPrompt(brief: string): string {
  return `品牌简报：\n${brief}\n\n请产出完整品牌视觉系统 JSON。`
}

export const COPY_PROMPT = `你是一家顶级品牌咨询公司的资深文案 Agent。基于已确定的品牌视觉系统和用户简报，产出整套上市传播物料的文案。文案必须严格遵循品牌的语气关键词，中英文俱佳，克制而有力量。

只输出一个 JSON 对象，结构如下：
{
  "intro": "品牌简介，80-120字，用于宣传册内页",
  "manifesto": ["品牌宣言短句1", "短句2", "短句3"],
  "pillars": [
    { "tag": "两字标签", "title": "内容板块标题", "desc": "40-60字描述" }
  ],
  "quotes": [
    { "text": "金句，20-40字", "source": "出处，如：主理人 / 创刊词" }
  ],
  "programs": [
    { "no": "No.01", "title": "节目或书目名", "subtitle": "一行副标题", "date": "如 11.08" }
  ],
  "cta": { "headline": "行动号召主句", "sub": "补充一句" },
  "socialCaptions": [
    { "title": "社媒标题", "body": "社媒配文，50字左右，可含1-2个话题标签" }
  ]
}

数量要求：pillars 恰好 3 个；quotes 恰好 2 条；programs 恰好 4 条；socialCaptions 恰好 3 条（依次对应方图引用卡、竖图节目卡、横图 banner）。`

export function buildCopyUserPrompt(brief: string, brand: BrandSystem): string {
  return `品牌简报：\n${brief}\n\n已确定的品牌视觉系统：\n${JSON.stringify(
    { brandName: brand.brandName, brandNameEn: brand.brandNameEn, category: brand.category, slogan: brand.slogan, tone: brand.tone, motifs: brand.motifs },
    null,
    2
  )}\n\n请产出整套物料文案 JSON。`
}

export const PATCH_SYSTEM_PROMPT = `你是品牌视觉系统的编辑 Agent。用户会框选物料上的某个区域，并用一句自然语言提出修改意见。你需要把这句话翻译成对品牌 token 的最小化修改补丁。

当前品牌系统会完整给出。只输出一个 JSON 补丁对象，只包含需要修改的字段，未提及的字段一律不要出现。可修改的字段：
- colors.primary / colors.secondary / colors.accent / colors.ink / colors.paper / colors.muted（十六进制色值）
- fonts.display / fonts.body（必须从字体菜单选 id）、fonts.displayWeight（300/400/500/600/700/900）
- slogan.zh / slogan.en
- tone（数组）、motifs（数组）

字体菜单：
${fontMenuText}

理解要求：
- 所有颜色相对指令必须在 HSL 空间执行并输出计算后的具体 hex：
  · "向 X 偏移/偏 X 一点" = 把 H 移入 X 色族的典型区间（朱红 5-15、橙 20-35、旧金 35-50、
    深绿 140-160、草绿 90-120、钴蓝 205-220、普鲁士蓝 210-230 压饱和、绛红 340-355），
    "一档"约束的是 S 与 L：两者相对当前值变化均 ≤10；除非指令同时提到深浅/灰艳
  · "深一档/暗一点" = L -8~-15（H、S 不变）；"浅一档/亮一点" = L +8~+12（H、S 不变）
  · "灰一点/柔一点" = S -10~-20（H、L 不变）；"艳一点/鲜明一点" = S +10~+20（H、L 不变）
  · 复合指令按顺序叠加（如"向深绿偏移一档" = H 入 140-160 且 S/L 变化 ≤10）
  · 未被指令提及的维度一律保持原值，禁止顺手调整
- "更轻的字重"意味着 displayWeight 下调 1-2 档
- 修改主色时，如果辅色/点缀色与主色同族，可一并微调保持协调，但不要过度修改
- 输出必须是合法 JSON，即使只改一个字段`

export function buildPatchUserPrompt(instruction: string, brand: BrandSystem, selectedText: string): string {
  return `当前品牌系统：\n${JSON.stringify(brand, null, 2)}\n\n用户框选区域的文字内容：${selectedText || '（图形区域）'}\n\n用户的修改意见：${instruction}\n\n请输出 JSON 补丁。`
}

/** 将补丁深度合并进品牌系统 */
export function applyPatch(brand: BrandSystem, patch: BrandPatch): BrandSystem {
  return {
    ...brand,
    colors: { ...brand.colors, ...(patch.colors ?? {}) },
    fonts: { ...brand.fonts, ...(patch.fonts ?? {}) },
    slogan: { ...brand.slogan, ...(patch.slogan ?? {}) },
    tone: patch.tone ?? brand.tone,
    motifs: patch.motifs ?? brand.motifs,
  }
}

// ── "一档"契约的代码侧强制 ─────────────────────────
// 模型给色相方向（色族判断它做得对），S/L 的步长约束由代码兜底：
// 指令未提及深浅/灰艳时，S 与 L 相对原值的变化强制 ≤10。

const DEPTH_INTENT = /(调|变|更)?深(一点|一些|一档|些)|(调|变|更)?浅(一点|一些|一档|些)|暗(一点|一些|一档)|亮(一点|一些|一档)|(调|变)深|(调|变)浅|更深|更浅/
const SAT_INTENT = /灰(一点|一些|一档)|更灰|柔(一点|一些|一档)|更柔|艳(一点|一些|一档)|更艳|鲜明|饱和/

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function clampPatchColors(patch: BrandPatch, brand: BrandSystem, instruction: string): BrandPatch {
  if (!patch.colors) return patch
  const allowL = DEPTH_INTENT.test(instruction)
  const allowS = SAT_INTENT.test(instruction)
  const out: Partial<BrandSystem['colors']> = {}
  for (const [k, v] of Object.entries(patch.colors)) {
    const key = k as keyof BrandSystem['colors']
    const oldHex = brand.colors[key]
    if (!v || !/^#[0-9a-fA-F]{6}$/.test(v) || !oldHex) continue
    const [, os, ol] = hexToHsl(oldHex)
    const [nh, ns, nl] = hexToHsl(v)
    const fs = allowS ? ns : clamp(ns, os - 10, os + 10)
    const fl = allowL ? nl : clamp(nl, ol - 10, ol + 10)
    out[key] = hslToHex(nh, fs, fl)
  }
  return { ...patch, colors: out }
}
