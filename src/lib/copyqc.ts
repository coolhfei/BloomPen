import type { CopyBundle } from './types'

/**
 * 文案质检与清洗层 —— 场景无关的公共底层。
 * 不论什么行业/品牌进来，所有文案先过这层管道再进模板：
 * 1. sanitizeCopy：确定性清洗（剥载体词/剥话题标签/长度收敛/补标点）
 * 2. checkCopy：硬违规检测（供编排层决定是否重生成一次）
 */

// ── 清洗规则 ─────────────────────────────────────

/** 剥载体/类型词前缀（"方图引用卡｜xxx""竖图节目卡：xxx"） */
export const stripCardLabel = (t: string): string =>
  t
    .replace(/^[^｜|：:]{0,14}(方图|竖图|横图|引用卡|节目卡|海报卡|卖点卡|卡片|长图|Banner|banner|海报|宣传册|封面|封底)[｜|：:]\s*/, '')
    .trim()

/** 剥 #话题标签（发布侧用，不上卡） */
export const stripHashtags = (t: string): string =>
  t.replace(/#[^#\s　]+/g, '').replace(/\s{2,}/g, ' ').trim()

/** 句读收敛：中文长文本结尾必须是句读符号，否则补 。（防截断感） */
export const ensureSentenceEnd = (t: string): string => {
  const s = t.trim()
  if (!s) return s
  return /[。！？!?.…；;：:，,]$/.test(s) ? s : s + '。'
}

/** 长度收敛：超长截断到最近的标点处，找不到就硬截 */
export const clampText = (t: string, max: number): string => {
  const s = t.trim()
  if (s.length <= max) return s
  const cut = s.slice(0, max)
  const lastPunct = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('，'), cut.lastIndexOf('；'), cut.lastIndexOf('、'), cut.lastIndexOf('：'))
  return lastPunct > max * 0.4 ? cut.slice(0, lastPunct + 1) : cut.replace(/[，、；：,;:\s]+$/, '') + '…'
}

// ── 违禁词（广告法绝对化 + 行业黑话）─────────────
const BANNED = ['赋能', '抓手', '闭环', '沉浸式', '打造', '助力', '引领', '极致', '一站式', '最', '第一', '顶级', '唯一', '国家级', '全网最低', '史上']

/** 标题收敛：剥句读/空白尾巴（标题是词组不是句子） */
export const stripTitleTail = (t: string): string => t.trim().replace(/[，。！？、；：,;:!?\s]+$/, '')

// ── 整包清洗 ─────────────────────────────────────

export function sanitizeCopy(copy: CopyBundle): CopyBundle {
  const c = structuredClone(copy)
  c.intro = ensureSentenceEnd(clampText(c.intro ?? '', 170))
  c.manifesto = (c.manifesto ?? []).map((m) => clampText(m, 26))
  c.pillars = (c.pillars ?? []).map((p) => ({
    ...p,
    tag: clampText(p.tag, 4),
    title: stripTitleTail(clampText(p.title, 14)),
    desc: ensureSentenceEnd(clampText(p.desc, 100)),
  }))
  c.quotes = (c.quotes ?? []).map((q) => ({
    ...q,
    text: ensureSentenceEnd(clampText(q.text, 52)),
    source: clampText(q.source, 16),
  }))
  c.dataPoints = (c.dataPoints ?? []).map((d) => ({ value: clampText(d.value, 10), label: clampText(d.label, 10) }))
  c.programs = (c.programs ?? []).map((p) => ({
    ...p,
    title: clampText(p.title, 16),
    subtitle: ensureSentenceEnd(clampText(p.subtitle, 26)),
    date: clampText(p.date, 8),
  }))
  c.cta = {
    headline: stripTitleTail(clampText(c.cta?.headline ?? '', 18)),
    sub: clampText(c.cta?.sub ?? '', 34),
  }
  c.socialCaptions = (c.socialCaptions ?? []).map((s) => ({
    title: stripTitleTail(stripCardLabel(clampText(s.title, 20))),
    body: ensureSentenceEnd(stripHashtags(clampText(s.body, 100))),
  }))
  return c
}

// ── 硬违规检测（决定是否值得重生成一次）───────────

export interface CopyViolation {
  field: string
  issue: string
}

export function checkCopy(copy: CopyBundle): CopyViolation[] {
  const v: CopyViolation[] = []
  const fields: [string, string][] = [
    ['intro', copy.intro ?? ''],
    ['cta.headline', copy.cta?.headline ?? ''],
    ['cta.sub', copy.cta?.sub ?? ''],
    ...(copy.pillars ?? []).map((p, i): [string, string] => [`pillars[${i}].desc`, p.desc]),
    ...(copy.socialCaptions ?? []).map((s, i): [string, string] => [`socialCaptions[${i}].body`, s.body]),
  ]
  for (const [field, text] of fields) {
    for (const w of BANNED) {
      if (text.includes(w)) v.push({ field, issue: `含违禁词「${w}」` })
    }
    if (text.trim().length > 10 && !/[。！？!?.]$/.test(text.trim())) {
      v.push({ field, issue: '结尾缺标点（疑似截断）' })
    }
  }
  for (const [i, s] of (copy.socialCaptions ?? []).entries()) {
    if (/方图|竖图|横图|引用卡|节目卡|卡片|Banner/.test(s.title)) {
      v.push({ field: `socialCaptions[${i}].title`, issue: '标题含载体词' })
    }
  }
  if (!copy.intro?.trim()) v.push({ field: 'intro', issue: '简介为空' })
  if (!(copy.pillars?.length >= 3)) v.push({ field: 'pillars', issue: '板块不足 3 个' })
  return v
}
