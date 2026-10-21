import { base64ToDataUrl, fetchBase64, httpRequest } from './transport'
import type { ImageConfig } from './types'

const NEGATIVE = '文字，汉字，英文字母，水印，logo，低质量，畸形，模糊，过曝'

/** 英雄图目标比例 3:4 竖幅；各适配器取各自合法尺寸，模板 object-fit 裁切 */
export async function generateHero(
  cfg: ImageConfig,
  prompt: string,
  onProgress?: (msg: string) => void
): Promise<string | null> {
  switch (cfg.kind) {
    case 'none':
      return null
    case 'a1111':
      return genA1111(cfg, prompt, onProgress)
    case 'comfyui':
      return genComfyUI(cfg, prompt, onProgress)
    case 'dashscope':
      return genDashScope(cfg, prompt, onProgress)
    case 'openai-images':
      return genOpenAIImages(cfg, prompt, onProgress)
  }
}

/** AUTOMATIC1111 / Forge：POST /sdapi/v1/txt2img，返回 b64 */
async function genA1111(cfg: ImageConfig, prompt: string, onProgress?: (m: string) => void): Promise<string> {
  const base = cfg.baseURL.replace(/\/+$/, '')
  onProgress?.('A1111 出图中…')
  const res = await httpRequest({
    url: `${base}/sdapi/v1/txt2img`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      negative_prompt: NEGATIVE,
      width: 832,
      height: 1216,
      steps: 28,
      cfg_scale: 7,
    }),
    responseType: 'json',
    timeoutMs: 300_000,
  })
  if (res.status < 200 || res.status >= 300) throw new Error(`A1111 生图失败（HTTP ${res.status}）：${res.body.slice(0, 160)}`)
  const b64 = JSON.parse(res.body)?.images?.[0]
  if (!b64) throw new Error('A1111 未返回图片')
  return base64ToDataUrl(b64)
}

/** ComfyUI：内置默认 txt2img 工作流（用户配置 checkpoint 名），提交后轮询 /history */
async function genComfyUI(cfg: ImageConfig, prompt: string, onProgress?: (m: string) => void): Promise<string> {
  const base = cfg.baseURL.replace(/\/+$/, '')
  const ckpt = cfg.ckptName.trim()
  if (!ckpt) throw new Error('ComfyUI 适配器需要在设置中填写 checkpoint 文件名')
  const workflow = {
    1: { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: ckpt } },
    2: {
      class_type: 'CLIPTextEncode',
      inputs: { text: prompt, clip: ['1', 1] },
    },
    3: {
      class_type: 'CLIPTextEncode',
      inputs: { text: NEGATIVE, clip: ['1', 1] },
    },
    4: {
      class_type: 'EmptyLatentImage',
      inputs: { width: 832, height: 1216, batch_size: 1 },
    },
    5: {
      class_type: 'KSampler',
      inputs: {
        seed: Math.floor(Math.random() * 2 ** 32),
        steps: 26,
        cfg: 7,
        sampler_name: 'dpmpp_2m',
        scheduler: 'karras',
        denoise: 1,
        model: ['1', 0],
        positive: ['2', 0],
        negative: ['3', 0],
        latent_image: ['4', 0],
      },
    },
    6: { class_type: 'VAEDecode', inputs: { samples: ['5', 0], vae: ['1', 2] } },
    7: { class_type: 'SaveImage', inputs: { filename_prefix: 'brandforge', images: ['6', 0] } },
  }
  onProgress?.('ComfyUI 任务提交…')
  const sub = await httpRequest({
    url: `${base}/prompt`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
    responseType: 'json',
    timeoutMs: 60_000,
  })
  if (sub.status < 200 || sub.status >= 300) throw new Error(`ComfyUI 提交失败（HTTP ${sub.status}）：${sub.body.slice(0, 200)}`)
  const promptId: string = JSON.parse(sub.body)?.prompt_id
  if (!promptId) throw new Error('ComfyUI 未返回 prompt_id')

  const deadline = Date.now() + 300_000
  while (Date.now() < deadline) {
    await sleep(2000)
    onProgress?.('ComfyUI 渲染中…')
    const hist = await httpRequest({ url: `${base}/history/${promptId}`, responseType: 'json', timeoutMs: 30_000 })
    if (hist.status === 200) {
      const node = JSON.parse(hist.body)?.[promptId]
      const out = node?.outputs?.['7']?.images?.[0]
      if (node?.status?.status_str === 'error') throw new Error('ComfyUI 工作流执行出错')
      if (out) {
        const q = new URLSearchParams({ filename: out.filename, subfolder: out.subfolder ?? '', type: out.type ?? 'output' })
        const b64 = await fetchBase64(`${base}/view?${q.toString()}`)
        return base64ToDataUrl(b64)
      }
    }
  }
  throw new Error('ComfyUI 生图超时')
}

/** 阿里云百炼：wanx 系走异步 text2image 端点，qwen-image 系走同步 multimodal-generation 端点 */
async function genDashScope(cfg: ImageConfig, prompt: string, onProgress?: (m: string) => void): Promise<string> {
  if (!cfg.apiKey) throw new Error('DashScope 适配器需要填写 API Key')
  const model = cfg.model || 'wanx2.1-t2i-turbo'
  const isQwenImage = model.startsWith('qwen-image')
  return isQwenImage ? genDashScopeQwen(cfg, model, prompt, onProgress) : genDashScopeWanx(cfg, model, prompt, onProgress)
}

/** qwen-image 系：POST multimodal-generation/generation（同步，一次出图） */
async function genDashScopeQwen(cfg: ImageConfig, model: string, prompt: string, onProgress?: (m: string) => void): Promise<string> {
  onProgress?.('百炼同步出图中…')
  const res = await httpRequest({
    url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: {
        messages: [{ role: 'user', content: [{ text: prompt }] }],
      },
      parameters: {
        negative_prompt: NEGATIVE,
        size: '832*1248',
        n: 1,
      },
    }),
    responseType: 'json',
    timeoutMs: 300_000,
  })
  if (res.status < 200 || res.status >= 300) throw new Error(`百炼提交失败（HTTP ${res.status}）：${res.body.slice(0, 200)}`)
  const content = JSON.parse(res.body)?.output?.choices?.[0]?.message?.content
  const imageUrl: string | undefined = Array.isArray(content) ? content?.[0]?.image : content?.image
  if (!imageUrl) throw new Error('百炼未返回图片地址')
  return base64ToDataUrl(await fetchBase64(imageUrl))
}

/** wanx 系：异步任务 + 轮询 */
async function genDashScopeWanx(cfg: ImageConfig, model: string, prompt: string, onProgress?: (m: string) => void): Promise<string> {
  onProgress?.('百炼任务提交…')
  const sub = await httpRequest({
    url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
      'X-DashScope-Async': 'enable',
    },
    body: JSON.stringify({
      model: cfg.model || 'wanx2.1-t2i-turbo',
      input: { prompt, negative_prompt: NEGATIVE },
      parameters: { size: '864*1152', n: 1 },
    }),
    responseType: 'json',
    timeoutMs: 60_000,
  })
  if (sub.status < 200 || sub.status >= 300) throw new Error(`百炼提交失败（HTTP ${sub.status}）：${sub.body.slice(0, 160)}`)
  const taskId: string | undefined = JSON.parse(sub.body)?.output?.task_id
  if (!taskId) throw new Error('百炼未返回 task_id')
  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    await sleep(2000)
    onProgress?.('百炼渲染中…')
    const poll = await httpRequest({
      url: `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
      headers: { Authorization: `Bearer ${cfg.apiKey}` },
      responseType: 'json',
      timeoutMs: 30_000,
    })
    const out = JSON.parse(poll.body)?.output
    if (out?.task_status === 'SUCCEEDED') {
      const url: string | undefined = out?.results?.[0]?.url
      if (!url) throw new Error('百炼成功但未返回图片地址')
      return base64ToDataUrl(await fetchBase64(url))
    }
    if (out?.task_status === 'FAILED') throw new Error(`百炼生图失败：${out?.message ?? '未知'}`)
  }
  throw new Error('百炼生图超时')
}

/** OpenAI 兼容 images 端点（dall-e-3 / gpt-image-1 / 自建） */
async function genOpenAIImages(cfg: ImageConfig, prompt: string, onProgress?: (m: string) => void): Promise<string> {
  const base = cfg.baseURL.replace(/\/+$/, '')
  onProgress?.('images 端点出图中…')
  const res = await httpRequest({
    url: `${base}/images/generations`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: cfg.model || 'dall-e-3',
      prompt: `${prompt}（画面中不要出现任何文字）`,
      size: '1024x1792',
      response_format: 'b64_json',
    }),
    responseType: 'json',
    timeoutMs: 300_000,
  })
  if (res.status < 200 || res.status >= 300) throw new Error(`images 端点失败（HTTP ${res.status}）：${res.body.slice(0, 160)}`)
  const item = JSON.parse(res.body)?.data?.[0]
  if (item?.b64_json) return base64ToDataUrl(item.b64_json)
  if (item?.url) return base64ToDataUrl(await fetchBase64(item.url))
  throw new Error('images 端点未返回图片')
}

/** 连接测试（不真出图，探活服务） */
export async function testImage(cfg: ImageConfig): Promise<string> {
  switch (cfg.kind) {
    case 'none':
      return '已关闭生图（英雄区将使用程序化视觉）'
    case 'a1111': {
      const r = await httpRequest({ url: `${cfg.baseURL.replace(/\/+$/, '')}/sdapi/v1/options`, responseType: 'json', timeoutMs: 15_000 })
      if (r.status !== 200) throw new Error(`HTTP ${r.status}`)
      return `A1111 在线 · sd_model=${JSON.parse(r.body)?.sd_model_checkpoint ?? '?'}`
    }
    case 'comfyui': {
      const r = await httpRequest({ url: `${cfg.baseURL.replace(/\/+$/, '')}/system_stats`, responseType: 'json', timeoutMs: 15_000 })
      if (r.status !== 200) throw new Error(`HTTP ${r.status}`)
      return `ComfyUI 在线 · ${JSON.parse(r.body)?.system?.os ?? ''}`
    }
    case 'dashscope': {
      const r = await httpRequest({
        url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/models',
        headers: { Authorization: `Bearer ${cfg.apiKey}` },
        responseType: 'json',
        timeoutMs: 15_000,
      })
      if (r.status !== 200) throw new Error(`HTTP ${r.status}`)
      return 'Key 已填写（真实出图时校验）'
    }
    case 'openai-images': {
      const r = await httpRequest({
        url: `${cfg.baseURL.replace(/\/+$/, '')}/models`,
        headers: cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : undefined,
        responseType: 'json',
        timeoutMs: 15_000,
      })
      if (r.status !== 200) throw new Error(`HTTP ${r.status}`)
      return 'images 端点在线'
    }
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
