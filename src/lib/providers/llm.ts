import { parseJSONLoose } from '../json'
import { httpRequest } from './transport'
import type { LlmConfig } from './types'

/**
 * OpenAI 兼容 chat 适配器：一个实现通吃 Ollama / LM Studio / llama.cpp / vLLM / 云端各家。
 * JSON 输出双保险：支持时发 response_format，否则仅靠提示词约束 + 容错解析。
 */
export async function chatJSON<T>(
  cfg: LlmConfig,
  system: string,
  user: string,
  temperature = 0.8
): Promise<T> {
  const baseURL = cfg.baseURL.replace(/\/+$/, '')
  const body: Record<string, unknown> = {
    model: cfg.model,
    temperature,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  }
  if (cfg.jsonMode) body.response_format = { type: 'json_object' }

  const res = await httpRequest({
    url: `${baseURL}/chat/completions`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
    },
    body: JSON.stringify(body),
    responseType: 'text',
    timeoutMs: 180_000,
  })
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`LLM 请求失败（HTTP ${res.status}）：${res.body.slice(0, 200)}`)
  }
  let content = ''
  try {
    const data = JSON.parse(res.body)
    content = data?.choices?.[0]?.message?.content ?? ''
  } catch {
    throw new Error(`LLM 响应不是合法 JSON：${res.body.slice(0, 120)}`)
  }
  if (!content) throw new Error('LLM 返回空内容')
  return parseJSONLoose<T>(content)
}

/** 连接测试：一次极短调用 */
export async function testLlm(cfg: LlmConfig): Promise<string> {
  const baseURL = cfg.baseURL.replace(/\/+$/, '')
  const res = await httpRequest({
    url: `${baseURL}/chat/completions`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [{ role: 'user', content: '回复"ok"两个字母' }],
      max_tokens: 8,
    }),
    responseType: 'text',
    timeoutMs: 30_000,
  })
  if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}：${res.body.slice(0, 160)}`)
  const data = JSON.parse(res.body)
  return data?.model ?? cfg.model
}
