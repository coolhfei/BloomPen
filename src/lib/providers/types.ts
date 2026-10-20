/**
 * 模型 Provider 配置 —— 用户自配，本地优先。
 * LLM 走 OpenAI 兼容协议（Ollama / LM Studio / llama.cpp / vLLM / 云端各家）；
 * 生图为可插拔适配器（A1111 / ComfyUI / DashScope / OpenAI-images / 关闭）。
 */

export interface LlmConfig {
  /** OpenAI 兼容 base url，如 http://127.0.0.1:11434/v1 */
  baseURL: string
  /** 本地服务通常留空 */
  apiKey: string
  model: string
  /** 服务端是否支持 response_format=json_object（Ollama/LM Studio/vLLM 支持；不确定可关） */
  jsonMode: boolean
}

export type ImageKind = 'none' | 'a1111' | 'comfyui' | 'dashscope' | 'openai-images'

export interface ImageConfig {
  kind: ImageKind
  /** a1111/comfyui/openai-images 的服务地址；dashscope 留空 */
  baseURL: string
  apiKey: string
  /** openai-images / dashscope 的模型 id */
  model: string
  /** comfyui 工作流使用的 checkpoint 文件名 */
  ckptName: string
}

export interface AppSettings {
  llm: LlmConfig
  image: ImageConfig
}

export const DEFAULT_SETTINGS: AppSettings = {
  llm: { baseURL: '', apiKey: '', model: '', jsonMode: true },
  image: { kind: 'none', baseURL: '', apiKey: '', model: '', ckptName: '' },
}

/** 推荐模型清单（设置页展示） */
export const RECOMMENDED = {
  llm: [
    { id: 'qwen3:14b', note: 'Ollama · 中文文案与 JSON 遵循度均衡（推荐下限）' },
    { id: 'qwen3:32b', note: 'Ollama · 品牌文案质量更佳，需 ≥24G 显存或大内存' },
    { id: 'glm-4:9b', note: 'Ollama · 中文创作向' },
    { id: 'qwen-plus', note: '云端 · 阿里百炼 OpenAI 兼容端点 https://dashscope.aliyuncs.com/compatible-mode/v1' },
  ],
  image: [
    { kind: 'a1111' as ImageKind, note: 'AUTOMATIC1111 / Forge · http://127.0.0.1:7860 · 需 --api 启动' },
    { kind: 'comfyui' as ImageKind, note: 'ComfyUI · http://127.0.0.1:8188 · 内置默认 txt2img 工作流' },
    { kind: 'dashscope' as ImageKind, note: '云端 · 阿里百炼 wanx2.1-t2i-turbo' },
    { kind: 'openai-images' as ImageKind, note: 'OpenAI 兼容 images 端点（dall-e-3 / gpt-image-1）' },
  ],
}
