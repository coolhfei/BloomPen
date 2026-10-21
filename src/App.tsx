import { useCallback, useEffect, useRef, useState } from 'react'
import { AgentRail } from './components/AgentRail'
import { Stage, type Tab } from './components/Stage'
import { TokenInspector } from './components/TokenInspector'
import { SettingsModal } from './components/SettingsModal'
import { DEMO_BRIEFS, DEMO_RESULT } from './lib/demoData'
import { editBrandTokens, genBrand, genCopy, genHero, optimizeBrief, runPipeline } from './lib/orchestrator'
import { applyBrand } from './lib/tokens'
import { llmReady, loadSettings, saveSettings } from './lib/providers/config'
import type { AppSettings } from './lib/providers/types'
import type { AgentEvent, AgentId, GenResult } from './lib/types'

type Phase = 'idle' | 'running' | 'ready' | 'error'

interface Toast {
  id: number
  msg: string
  err?: boolean
}

export default function App() {
  const [brief, setBrief] = useState(DEMO_BRIEFS[0])
  const [showChips, setShowChips] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<GenResult>(DEMO_RESULT)
  const [brandVersion, setBrandVersion] = useState(0)
  const [events, setEvents] = useState<AgentEvent[]>([])
  const [tab, setTab] = useState<Tab>('brochure')
  const [editMode, setEditMode] = useState(false)
  const [editing, setEditing] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [flash, setFlash] = useState(false)
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [originalBrief, setOriginalBrief] = useState<string | null>(null)
  const [busyPart, setBusyPart] = useState<AgentId | null>(null)
  const toastId = useRef(0)

  const toast = useCallback((msg: string, err = false) => {
    const id = ++toastId.current
    setToasts((t) => [...t, { id, msg, err }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), err ? 6000 : 3200)
  }, [])

  // 初始：品牌 token 上树，首屏即可探索 UI
  useEffect(() => {
    applyBrand(DEMO_RESULT.brand)
  }, [])

  // 品牌 token 始终与当前 result 同步（一处修改、全局一致的根基）
  useEffect(() => {
    applyBrand(result.brand)
  }, [result, brandVersion])

  const emit = useCallback((e: AgentEvent) => setEvents((prev) => [...prev, e]), [])

  const onOptimizeBrief = async () => {
    if (!brief.trim() || optimizing || phase === 'running') return
    if (!llmReady(settings)) {
      toast('请先在「模型设置」中配置文本模型', true)
      setSettingsOpen(true)
      return
    }
    setOptimizing(true)
    try {
      const optimized = await optimizeBrief(brief.trim(), settings)
      setOriginalBrief(brief)
      setBrief(optimized)
      toast('简报已优化，可继续手动微调；不满意可恢复原文')
    } catch (e) {
      toast(`简报优化失败：${(e as Error).message}`, true)
    } finally {
      setOptimizing(false)
    }
  }

  const run = async () => {
    if (!brief.trim() || phase === 'running') return
    if (!llmReady(settings)) {
      toast('请先在「模型设置」中配置文本模型（本地 Ollama 或云端兼容端点）', true)
      setSettingsOpen(true)
      return
    }
    setPhase('running')
    setEvents([])
    setEditMode(false)
    setTab('brochure')
    try {
      const res = await runPipeline(brief.trim(), emit, settings)
      setResult(res)
      setBrandVersion((v) => v + 1)
      setPhase('ready')
      toast('整套物料已生成 · 可框选编辑或导出')
    } catch (e) {
      const msg = (e as Error).message
      setPhase('error')
      emit({ agent: 'brand', type: 'error', message: msg })
      toast(`生成失败：${msg}`, true)
    }
  }

  /** 局部重生成：只重跑指定源头 Agent，其余产物原样保留 */
  const onRegen = async (id: AgentId) => {
    if (busyPart || phase === 'running') return
    setBusyPart(id)
    try {
      if (id === 'brand') {
        const brand = await genBrand(result.brief, settings.llm, emit)
        setResult((r) => ({ ...r, brand }))
        setBrandVersion((v) => v + 1)
        setFlash(true)
        setTimeout(() => setFlash(false), 1000)
        toast('品牌系统已重新生成 · 全部物料已按新规则渲染')
      } else if (id === 'copy') {
        const copy = await genCopy(result.brief, result.brand, settings.llm, emit)
        setResult((r) => ({ ...r, copy }))
        setFlash(true)
        setTimeout(() => setFlash(false), 1000)
        toast('文案已重新生成 · 宣传册/海报/社媒同步更新')
      } else if (id === 'visual') {
        const hero = await genHero(settings.image, result.brand, emit)
        setResult((r) => ({ ...r, heroUrl: hero ?? r.heroUrl }))
        toast(hero ? '主视觉已重新生成' : '生图失败，保留程序化视觉')
      }
    } catch (e) {
      toast(`重生成失败：${(e as Error).message}`, true)
    } finally {
      setBusyPart(null)
    }
  }

  const onEditSubmit = async (instruction: string, selectedText: string) => {
    setEditing(true)
    emit({ agent: 'brand', type: 'log', message: `框选编辑：「${instruction}」` })
    try {
      const { next, explain } = await editBrandTokens(instruction, result.brand, selectedText, settings)
      setResult((r) => ({ ...r, brand: next }))
      setBrandVersion((v) => v + 1)
      setFlash(true)
      setTimeout(() => setFlash(false), 1000)
      emit({ agent: 'brand', type: 'log', message: `${explain} · 全部物料已按新规则重渲染` })
      toast(`${explain} —— 一处修改，全局一致`)
    } catch (e) {
      emit({ agent: 'brand', type: 'error', message: `编辑解析失败：${(e as Error).message}` })
      toast(`编辑解析失败：${(e as Error).message}`, true)
    } finally {
      setEditing(false)
    }
  }

  const running = phase === 'running'

  return (
    <div className={`app ${flash ? 'token-flash' : ''}`}>
      {/* ── 顶栏 ── */}
      <header className="topbar">
        <div className="topbar-logo">
          <h1>Brand<em>Forge</em></h1>
          <span>一句话 · 整套品牌物料</span>
        </div>
        <div className="brief-area">
          <div className="brief-wrap">
            <textarea
              className="brief-input"
              rows={2}
              value={brief}
              disabled={running}
              placeholder="输入品牌简报，例如：为一家精品咖啡品牌生成上市传播物料包…"
              onChange={(e) => setBrief(e.target.value)}
              onFocus={() => setShowChips(true)}
              onBlur={() => setTimeout(() => setShowChips(false), 150)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run()
              }}
            />
            {showChips && (
              <div className="brief-chips">
                {DEMO_BRIEFS.map((b, i) => (
                  <button key={i} className="brief-chip" onMouseDown={() => setBrief(b)}>
                    {b}
                  </button>
                ))}
              </div>
            )}
            {originalBrief && brief !== originalBrief && (
              <button className="brief-undo" onClick={() => setBrief(originalBrief)}>
                ↩ 恢复原文
              </button>
            )}
          </div>
          <button className="btn" onClick={onOptimizeBrief} disabled={optimizing || running || !brief.trim()}>
            {optimizing ? '✨ 优化中…' : '✨ 优化简报'}
          </button>
          <button className="btn btn-primary" onClick={run} disabled={running || !brief.trim()}>
            {running ? '⚙ Agent 协作中…' : '⚡ 生成物料包'}
          </button>
          <button className="btn btn-sm" title="模型设置" onClick={() => setSettingsOpen(true)}>
            ⚙ 模型设置{llmReady(settings) ? '' : ' !'}
          </button>
        </div>
      </header>

      {/* ── 左侧管线 ── */}
      <AgentRail events={events} onRegen={onRegen} busyId={busyPart} />

      {/* ── 中央舞台 ── */}
      <Stage
        result={result}
        tab={tab}
        onTab={setTab}
        editMode={editMode}
        onToggleEdit={() => setEditMode((v) => !v)}
        onEditSubmit={onEditSubmit}
        editing={editing}
      />

      {/* ── 右侧检视器 ── */}
      <TokenInspector brand={result.brand} version={brandVersion} />

      {/* ── Toast ── */}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.err ? 'err' : ''}`}>
            {t.msg}
          </div>
        ))}
      </div>

      {/* ── 模型设置 ── */}
      {settingsOpen && (
        <SettingsModal
          initial={settings}
          onSave={(s) => {
            setSettings(s)
            saveSettings(s)
            toast('模型配置已保存到本机')
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}
