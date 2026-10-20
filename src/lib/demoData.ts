import type { GenResult } from './types'

/**
 * 预置演示品牌：「声景 SOUNDSCAPE」—— 城市人文内容品牌
 * 用途：1) 首屏默认预览  2) 演示模式回放兜底  3) API 故障时的降级数据
 */
export const DEMO_RESULT: GenResult = {
  brief: '为城市人文内容品牌「声景」生成上市传播物料包，包含播客节目、MOOK 书系和线下沙龙',
  savedAt: 0,
  heroUrl: null,
  brand: {
    brandName: '声景',
    brandNameEn: 'SOUNDSCAPE',
    category: '城市人文内容品牌',
    colors: {
      primary: '#1F4D3E',
      secondary: '#B4854A',
      accent: '#D4552F',
      ink: '#1C1A17',
      paper: '#F6F1E6',
      muted: '#8A8275',
    },
    fonts: { display: 'Noto Serif SC', body: 'Noto Sans SC', displayWeight: 700 },
    slogan: { zh: '把城市，讲给你听', en: 'Listen to the City' },
    tone: ['克制', '好奇', '有温度', '书卷气'],
    motifs: ['声波纹理', '城市等高线', '旧地图纸纹'],
    heroPrompt:
      '一幅充满人文气息的城市主视觉：清晨薄雾中的老城街巷，暖米色与深松绿色调，层叠的建筑轮廓如等高线般延展，一道细腻的声波曲线掠过天际，胶片颗粒质感，柔和的侧逆光，留白构图，编辑部美学，无文字',
  },
  copy: {
    intro:
      '声景是一间声音与纸墨构成的城市编辑部。我们用播客记录街巷里正在消失的声纹，用 MOOK 书系收藏城市的切片，用线下沙龙把陌生的耳朵聚在同一张桌子旁。每一期内容，都是一次对所在之地的深情重听。',
    manifesto: ['城市太大，我们从一条街听起。', '好的内容，值得被打印出来。', '把耳朵借给彼此，就是把城市还给彼此。'],
    pillars: [
      { tag: '播客', title: '声纹档案', desc: '每周一更的城市声音纪录片，收录正在消失的市井声纹与背后的人。' },
      { tag: 'MOOK', title: '声景书系', desc: '每季一册的杂志书，以一条街道为半径，做纸上的城市田野调查。' },
      { tag: '沙龙', title: '耳朵集会', desc: '每月一场线下声音漫游与对谈，让内容从耳机里走出来，落到街上。' },
    ],
    quotes: [
      { text: '你每天路过的街角，藏着一部没人录制的纪录片。', source: '创刊词第 2 段' },
      { text: '我们不做流量的生意，只做耳朵的邻居。', source: '主理人访谈' },
    ],
    dataPoints: [
      { value: '128 条', label: '已录街声音轨' },
      { value: '48 小时', label: '单季田野时长' },
      { value: '6 城', label: '沙龙巡回范围' },
    ],
    programs: [
      { no: 'No.01', title: '菜场交响曲', subtitle: '凌晨五点的声纹采集', date: '11.08' },
      { no: 'No.02', title: '电车环城记', subtitle: '一条老线路的最后一年', date: '11.15' },
      { no: 'No.03', title: '天台上的收音机', subtitle: '与城市制高点的对话', date: '11.22' },
      { no: 'No.04', title: '书店打烊时分', subtitle: '纸页翻动的分贝测量', date: '11.29' },
    ],
    cta: { headline: '戴上耳机，或者翻开第一页。', sub: '11 月 8 日，声景正式上线 · 全平台收听' },
    socialCaptions: [
      { title: '声音是城市的第二张地图', body: '有些街角的声音，只有停下来的人才听得见。#声景 #城市人文' },
      { title: 'No.01 菜场交响曲', body: '凌晨五点，城市还没醒，菜场先开了嗓。首期节目，带你听见烟火的原声。#声纹档案' },
      { title: '声景 SOUNDSCAPE · 11.08 上线', body: '播客 × MOOK × 沙龙，一间声音与纸墨的城市编辑部，等你入席。#ListenToTheCity' },
    ],
  },
}

export const DEMO_BRIEFS = [
  '为 AI 短视频 SaaS「速影 GenClip」（genclip.com）生成宣传物料包：上传一张商品图和一句话卖点，几分钟产出带配音、字幕、配乐的种草短视频，也能一键生成商品与节日海报；面向电商卖家与内容创作者，气质高效、可信、有科技感但不冷',
  '为城市人文内容品牌「声景」生成上市传播物料包，包含播客节目、MOOK 书系和线下沙龙',
  '为一家精品咖啡品牌生成上市传播物料包，主打单一产地手冲，气质克制现代',
  '为一个独立纪录片厂牌生成品牌物料包，关注边缘议题，风格粗粝而有力量',
]
