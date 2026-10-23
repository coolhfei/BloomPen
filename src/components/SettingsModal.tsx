import { useState } from 'react'
import { RECOMMENDED, type AppSettings, type ImageKind } from '../lib/providers/types'
import { testLlm } from '../lib/providers/llm'
import { testImage } from '../lib/providers/image'
import { isDesktop } from '../lib/providers/transport'

interface Props {
  initial: AppSettings
  onSave: (s: AppSettings) => void
  /** 清除本机全部配置（含 Key） */
  onClear: () => void
  onClose: () => void
}

const IMAGE_KINDS: { id: ImageKind; label: string }[] = [
  { id: 'none', label: '关闭（程序化视觉兜底）' },
  { id: 'a1111', label: 'AUTOMATIC1111 / Forge' },
  { id: 'comfyui', label: 'ComfyUI' },
  { id: 'dashscope', label: '阿里云百炼（云端）' },
  { id: 'openai-images', label: 'OpenAI 兼容 images' },
]

export function SettingsModal({ initial, onSave, onClear, onClose }: Props) {
  const [draft, setDraft] = useState<AppSettings>(structuredClone(initial))
  const [llmMsg, setLlmMsg] = useState<{ text: string; err?: boolean } | null>(null)
  const [imgMsg, setImgMsg] = useState<{ text: string; err?: boolean } | null>(null)
  const [testing, setTesting] = useState<'llm' | 'image' | null>(null)

  const setLlm = (patch: Partial<AppSettings['llm']>) => setDraft((d) => ({ ...d, llm: { ...d.llm, ...patch } }))
  const setImage = (patch: Partial<AppSettings['image']>) => setDraft((d) => ({ ...d, image: { ...d.image, ...patch } }))

  const doTest = async (which: 'llm' | 'image') => {
    setTesting(which)
    if (which === 'llm') setLlmMsg(null)
    else setImgMsg(null)
    try {
      const result = which === 'llm' ? await testLlm(draft.llm) : await testImage(draft.image)
      if (which === 'llm') setLlmMsg({ text: `✓ ${result}` })
      else setImgMsg({ text: `✓ ${result}` })
    } catch (e) {
      if (which === 'llm') setLlmMsg({ text: `✕ ${(e as Error).message}`, err: true })
      else setImgMsg({ text: `✕ ${(e as Error).message}`, err: true })
    } finally {
      setTesting(null)
    }
  }

  return (
    <div className="modal-mask" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <header className="modal-head">
          <h2>模型设置</h2>
          <span className="modal-sub">
            {isDesktop() ? '桌面端 · 请求经本地主进程转发，无 CORS 限制' : 'Web 模式 · 本地服务需按 README 开启 CORS'}
          </span>
          <button className="btn btn-sm" onClick={onClose}>
            ✕
          </button>
        </header>

        <div className="modal-body">
          <section className="set-sec">
            <h3>文本模型（OpenAI 兼容）</h3>
            <p className="set-hint">Ollama / LM Studio / llama.cpp / vLLM / 云端兼容端点均可。品牌系统与文案的质量取决于此模型。</p>
            <label className="set-label">Base URL</label>
            <input
              className="set-input"
              placeholder="http://127.0.0.1:11434/v1"
              value={draft.llm.baseURL}
              onChange={(e) => setLlm({ baseURL: e.target.value })}
            />
            <div className="set-row">
              <div className="set-col">
                <label className="set-label">模型名</label>
                <input
                  className="set-input"
                  placeholder="qwen3:14b"
                  value={draft.llm.model}
                  onChange={(e) => setLlm({ model: e.target.value })}
                />
              </div>
              <div className="set-col">
                <label className="set-label">API Key（本地留空）</label>
                <input
                  className="set-input"
                  type="password"
                  placeholder="sk-…（本地服务不需要）"
                  value={draft.llm.apiKey}
                  onChange={(e) => setLlm({ apiKey: e.target.value })}
                />
              </div>
            </div>
            <label className="set-check">
              <input
                type="checkbox"
                checked={draft.llm.jsonMode}
                onChange={(e) => setLlm({ jsonMode: e.target.checked })}
              />
              服务端支持 response_format=json_object（Ollama / LM Studio / vLLM / 云端均支持；报参数错误时关闭）
            </label>
            <div className="set-recs">
              {RECOMMENDED.llm.map((r) => (
                <button key={r.id} className="set-rec" onClick={() => setLlm({ model: r.id })}>
                  <b>{r.id}</b> {r.note}
                </button>
              ))}
            </div>
            <div className="set-test-row">
              <button className="btn btn-sm" onClick={() => doTest('llm')} disabled={testing !== null}>
                {testing === 'llm' ? '测试中…' : '测试连接'}
              </button>
              {llmMsg && <span className={`set-inline-msg ${llmMsg.err ? 'err' : ''}`}>{llmMsg.text}</span>}
            </div>
          </section>

          <section className="set-sec">
            <h3>生图适配器（英雄图，可选）</h3>
            <p className="set-hint">
              未配置或生成失败时，英雄区自动使用程序化视觉（等高线+声波），其余物料不受影响。
            </p>
            <label className="set-label">适配器</label>
            <select className="set-input" value={draft.image.kind} onChange={(e) => setImage({ kind: e.target.value as ImageKind })}>
              {IMAGE_KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
            {draft.image.kind !== 'none' && draft.image.kind !== 'dashscope' && (
              <>
                <label className="set-label">服务地址</label>
                <input
                  className="set-input"
                  placeholder={draft.image.kind === 'comfyui' ? 'http://127.0.0.1:8188' : 'http://127.0.0.1:7860'}
                  value={draft.image.baseURL}
                  onChange={(e) => setImage({ baseURL: e.target.value })}
                />
              </>
            )}
            {draft.image.kind === 'comfyui' && (
              <>
                <label className="set-label">Checkpoint 文件名</label>
                <input
                  className="set-input"
                  placeholder="如 sd_xl_base_1.0.safetensors"
                  value={draft.image.ckptName}
                  onChange={(e) => setImage({ ckptName: e.target.value })}
                />
              </>
            )}
            {(draft.image.kind === 'dashscope' || draft.image.kind === 'openai-images') && (
              <div className="set-row">
                <div className="set-col">
                  <label className="set-label">API Key</label>
                  <input
                    className="set-input"
                    type="password"
                    value={draft.image.apiKey}
                    onChange={(e) => setImage({ apiKey: e.target.value })}
                  />
                </div>
                <div className="set-col">
                  <label className="set-label">模型</label>
                  <input
                    className="set-input"
                    placeholder={draft.image.kind === 'dashscope' ? 'wanx2.1-t2i-turbo' : 'dall-e-3'}
                    value={draft.image.model}
                    onChange={(e) => setImage({ model: e.target.value })}
                  />
                </div>
              </div>
            )}
            <div className="set-recs">
              {RECOMMENDED.image.map((r) => (
                <div key={r.kind} className="set-rec static">
                  <b>{r.kind}</b> {r.note}
                </div>
              ))}
            </div>
            <div className="set-test-row">
              <button className="btn btn-sm" onClick={() => doTest('image')} disabled={testing !== null}>
                {testing === 'image' ? '测试中…' : '测试连接'}
              </button>
              {imgMsg && <span className={`set-inline-msg ${imgMsg.err ? 'err' : ''}`}>{imgMsg.text}</span>}
            </div>
          </section>

        </div>

        <footer className="modal-foot">
          <button
            className="btn btn-sm btn-danger"
            onClick={() => {
              if (window.confirm('确定清除本机全部模型配置（含 API Key）？此操作不可撤销。')) {
                onClear()
                onClose()
              }
            }}
          >
            清除全部配置
          </button>
          <span className="set-hint">配置仅保存在本机（localStorage），不上传任何服务器。</span>
          <div className="modal-actions">
            <button className="btn btn-sm" onClick={onClose}>
              取消
            </button>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => {
                onSave(draft)
                onClose()
              }}
            >
              保存
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
