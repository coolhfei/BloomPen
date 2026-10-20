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

export function llmReady(s: AppSettings): boolean {
  return !!s.llm.baseURL.trim() && !!s.llm.model.trim()
}
