import { useEffect, useRef, useState } from 'react'
import type { AgentEvent, AgentId, AgentStatus } from '../lib/types'

const AGENTS: { id: AgentId; name: string; en: string; desc: string }[] = [
  { id: 'brand', name: '品牌系统', en: 'BRAND', desc: '色彩 / 字体 / Slogan / 母题 → brand.json' },
  { id: 'copy', name: '文案', en: 'COPY', desc: '宣言 · 简介 · 排期 · 社媒配文' },
  { id: 'visual', name: '主视觉', en: 'VISUAL', desc: 'wanx 文生图 · 英雄图' },
  { id: 'layout', name: '版式', en: 'LAYOUT', desc: '宣传册 5 页网格排版' },
  { id: 'social', name: '社媒', en: 'SOCIAL', desc: '方图 / 竖图 / 横图三件套' },
]

interface NodeState {
  status: AgentStatus
  logs: { msg: string; err?: boolean }[]
}

const MAX_LOGS = 4

const initialState = (): Record<AgentId, NodeState> => ({
  brand: { status: 'idle', logs: [] },
  copy: { status: 'idle', logs: [] },
  visual: { status: 'idle', logs: [] },
  layout: { status: 'idle', logs: [] },
  social: { status: 'idle', logs: [] },
})

interface Props {
  events: AgentEvent[]
  /** 局部重生成：只有源头节点可单独重跑（版式/社媒是派生渲染，自动跟随） */
  onRegen?: (id: AgentId) => void
  busyId?: AgentId | null
}

const REGENABLE: AgentId[] = ['brand', 'copy', 'visual']

export function AgentRail({ events, onRegen, busyId }: Props) {
  const [states, setStates] = useState<Record<AgentId, NodeState>>(initialState)
  const lastCount = useRef(0)

  useEffect(() => {
    // 只处理新增事件
    const fresh = events.slice(lastCount.current)
    lastCount.current = events.length
    if (!fresh.length) return
    setStates((prev) => {
      const next = { ...prev }
      for (const e of fresh) {
        const cur = next[e.agent] ?? { status: 'idle', logs: [] }
        const node: NodeState = { status: cur.status, logs: cur.logs }
        if (e.type === 'status' && e.status) node.status = e.status
        if (e.type === 'log' && e.message) node.logs = [...node.logs, { msg: e.message }].slice(-MAX_LOGS)
        if (e.type === 'error' && e.message) {
          node.status = 'error'
          node.logs = [...node.logs, { msg: e.message, err: true }].slice(-MAX_LOGS)
        }
        next[e.agent] = node
      }
      return next
    })
  }, [events])

  // 重新生成时清空：由 App 传入 reset 信号（events 长度为 0）
  useEffect(() => {
    if (events.length === 0) {
      lastCount.current = 0
      setStates(initialState())
    }
  }, [events])

  const done = AGENTS.filter((a) => states[a.id]?.status === 'done').length

  return (
    <aside className="rail">
      <div className="rail-title">
        <span>Agent Pipeline</span>
        <span>{done}/{AGENTS.length}</span>
      </div>
      {AGENTS.map((a, i) => {
        const st = states[a.id] ?? { status: 'idle', logs: [] }
        return (
          <div key={a.id}>
            {i > 0 && <div className={`agent-connector${i === 1 ? ' branch' : ''}`} />}
            <div className={`agent-node ${st.status}`}>
              <span className="agent-led" />
              <div className="agent-name">
                {a.name} <span className="en">{a.en} AGENT</span>
                {onRegen && REGENABLE.includes(a.id) && st.status !== 'idle' && (
                  <button
                    className="agent-regen"
                    title={`重新生成${a.name}`}
                    disabled={busyId != null}
                    onClick={() => onRegen(a.id)}
                  >
                    {busyId === a.id ? '⏳' : '↻'}
                  </button>
                )}
              </div>
              <div className="agent-desc">{a.desc}</div>
              {st.logs.length > 0 && (
                <div className="agent-logs">
                  {st.logs.map((l, j) => (
                    <div key={j} className={`agent-log${l.err ? ' err' : ''}`}>
                      {l.msg}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </aside>
  )
}
