/** 品牌视觉系统 —— 整套物料的唯一事实来源（Design Rails 式结构化品牌文件） */
export interface BrandSystem {
  brandName: string
  brandNameEn: string
  category: string
  colors: {
    /** 主色 */
    primary: string
    /** 辅色 */
    secondary: string
    /** 点缀色（高饱和，小面积使用） */
    accent: string
    /** 正文墨色 */
    ink: string
    /** 纸面底色 */
    paper: string
    /** 弱化灰 */
    muted: string
  }
  fonts: {
    /** 标题字体（从 FONT_MENU 中选） */
    display: string
    /** 正文字体（从 FONT_MENU 中选） */
    body: string
    /** 标题字重 300-900 */
    displayWeight: number
  }
  slogan: { zh: string; en: string }
  /** 品牌语气关键词，3-5 个 */
  tone: string[]
  /** 视觉母题描述（用于装饰图形与生图提示词），2-4 个 */
  motifs: string[]
  /** 主视觉生图提示词（由品牌系统 Agent 产出） */
  heroPrompt: string
}

/** 文案包 —— 文案 Agent 产出 */
export interface CopyBundle {
  /** 品牌简介，80-120 字 */
  intro: string
  /** 品牌宣言，3 句短句 */
  manifesto: string[]
  /** 内容矩阵 3-4 项 */
  pillars: { tag: string; title: string; desc: string }[]
  /** 金句 2 条（社媒引用卡） */
  quotes: { text: string; source: string }[]
  /** 品牌数据钩子 3 条（value=数字+单位，label≤8字），用于页面装饰带 */
  dataPoints: { value: string; label: string }[]
  /** 上市排期节目/书目 4 条 */
  programs: { no: string; title: string; subtitle: string; date: string }[]
  /** 行动号召 */
  cta: { headline: string; sub: string }
  /** 社媒配文 3 条，对应方图/竖图/横图 */
  socialCaptions: { title: string; body: string }[]
}

/** 用户上传的商品图（用户资产：重生成/框选编辑永不动它） */
export interface ProductImage {
  id: string
  /** 原图 dataURL（超长边已下采样至 1600） */
  dataUrl: string
  /** 原始 MIME（上传时记录，透明检测快路径用） */
  mime: string
  /** 透明底版（原图直通或抠图产出）；null = 未就绪/不可用 → 直嵌 */
  cutoutUrl: string | null
  isMain: boolean
}

export interface GenResult {
  brief: string
  brand: BrandSystem
  copy: CopyBundle
  /** 英雄图地址（同源代理路径或 dataURL），可能为 null（生图失败兜底） */
  heroUrl: string | null
  /** 易拉宝专用英雄图（单独重生成时独立于海报/社媒；null 则使用 heroUrl） */
  rollupHeroUrl?: string | null
  /** 商品图集（空数组 = 未上传，全走现有兜底） */
  products: ProductImage[]
  savedAt: number
}

/** LLM 返回的 token 补丁（框选编辑） */
export type BrandPatch = {
  colors?: Partial<BrandSystem['colors']>
  fonts?: Partial<BrandSystem['fonts']>
  slogan?: Partial<BrandSystem['slogan']>
  tone?: string[]
  motifs?: string[]
}

export type AgentId = 'brand' | 'copy' | 'visual' | 'layout' | 'social'

export type AgentStatus = 'idle' | 'running' | 'done' | 'error'

export interface AgentEvent {
  agent: AgentId
  type: 'status' | 'log' | 'error'
  status?: AgentStatus
  message?: string
}

/** 品牌字体菜单：LLM 只能从中选择，保证字体已预加载且渲染稳定 */
export const FONT_MENU = [
  {
    id: 'Noto Serif SC',
    label: '思源宋体',
    feel: '人文衬线，庄重而有书卷气',
    weights: [300, 400, 500, 600, 700, 900],
    scenes: '人文、纸感、茶饮、文化、生活方式',
    note: '',
  },
  {
    id: 'Noto Sans SC',
    label: '思源黑体',
    feel: '现代无衬线，干净利落',
    weights: [300, 400, 500, 600, 700, 900],
    scenes: '科技、效率、工具、电商、医疗、政务',
    note: '可读性最高，远看可辨，默认安全选择',
  },
  {
    id: 'ZCOOL XiaoWei',
    label: '站酷小薇',
    feel: '纤细优雅，文艺轻盈',
    weights: [400],
    scenes: '优雅文艺、女性向、轻奢',
    note: '仅 400 一个字重，禁止假加粗',
  },
  {
    id: 'ZCOOL QingKe HuangYou',
    label: '站酷庆科黄油',
    feel: '厚重圆润，年轻有冲击力',
    weights: [400],
    scenes: '仅限年轻食品、娱乐、潮玩、节庆促销类轻松场景',
    note: '仅 400 一个字重，笔画密，小字号难辨，标题慎用',
  },
  {
    id: 'Ma Shan Zheng',
    label: '马善政楷书',
    feel: '手写楷书法度，东方气韵',
    weights: [400],
    scenes: '东方传统、手作、书法气质',
    note: '仅 400 一个字重，手写体，正文勿用',
  },
  {
    id: 'Long Cang',
    label: '龙藏体',
    feel: '随性手写，自由不羁',
    weights: [400],
    scenes: '随性生活、手账、轻松随笔',
    note: '仅 400 一个字重，手写体，小字号难辨',
  },
] as const

export function fontMenu(id: string) {
  return FONT_MENU.find((f) => f.id === id)
}
