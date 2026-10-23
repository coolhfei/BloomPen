import { DEFAULT_SETTINGS, type AppSettings } from './types'

const KEY = 'brandforge.settings.v1'

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(DEFAULT_SETTINGS)
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return {
      llm: { ...DEFAULT_SETTINGS.llm, ...(parsed.llm ?? {}) },
      image: { ...DEFAULT_SETTINGS.image, ...(parsed.image ?? {}) },
    }
  } catch {
    return structuredClone(DEFAULT_SETTINGS)
  }
}

export function saveSettings(s: AppSettings): void {
  localStorage.setItem(KEY, JSON.stringify(s))
}

/** 清除本机全部模型配置（含 API Key）；返回全新默认配置 */
export function clearSettings(): AppSettings {
  localStorage.removeItem(KEY)
  return structuredClone(DEFAULT_SETTINGS)
}

export function llmReady(s: AppSettings): boolean {
  return !!s.llm.baseURL.trim() && !!s.llm.model.trim()
}
