import { useEffect, useRef, useState } from 'react'
import type { BrandSystem, GenResult } from '../lib/types'
import { Brochure } from './Brochure'
import { Poster } from './Poster'
import { BannerCard, ProgramCard, QuoteCard } from './Social'
import { LogoMark, MotifDecor } from './BrandMark'
import { exportPdf, exportPng, exportTagged } from '../lib/exports'
import templatesCss from './templates.css?inline'

export type Tab = 'brand' | 'brochure' | 'poster' | 'social'

interface Props {
  result: GenResult
  tab: Tab
  onTab: (t: Tab) => void
  editMode: boolean
  onToggleEdit: () => void
  onEditSubmit: (instruction: string, selectedText: string) => Promise<void>
  editing: boolean
}

/** 缩放展示框：内层保持真实导出尺寸，外层按舞台空间缩放 */
function ScaleFrame({
  w,
  h,
  scale,
  children,
}: {
  w: number
  h: number
  scale: number
  children: React.ReactNode
}) {
  return (
    <div className="bf-frame" style={{ width: w * scale, height: h * scale }}>
      <div style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  )
}

const BROCHURE_W = 794 * 3 + 28 * 2 // 3+2 两行排布：一行 3 页
const BROCHURE_H = 1123 * 2 + 28

export function Stage({ result, tab, onTab, editMode, onToggleEdit, onEditSubmit, editing }: Props) {
  const { brand, copy, heroUrl } = result
  const bodyRef = useRef<HTMLDivElement>(null)
  const brochureRef = useRef<HTMLDivElement>(null)
  const posterRef = useRef<HTMLDivElement>(null)
  const socialRef = useRef<HTMLDivElement>(null)

  const [bodySize, setBodySize] = useState({ w: 900, h: 600 })
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setBodySize({ w: el.clientWidth - 56, h: el.clientHeight - 56 })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [tab])

  // ── 点击放大（Lightbox）─────────────────────────
  const [zoom, setZoom] = useState<{ html: string; w: number; h: number; label: string } | null>(null)
  const [zoomMode, setZoomMode] = useState<'fit' | 1 | 1.5>('fit')

  useEffect(() => {
    if (!zoom) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoom(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoom])

  const openZoom = (e: React.MouseEvent) => {
    if (editMode) return
    const target = e.target as HTMLElement
    const node = target.closest<HTMLElement>('.bf-page, .bf-poster, .bf-sq, .bf-vt, .bf-bn, .bf-sheet')
    if (!node || node.closest('.lightbox-mask')) return
    let label = '物料'
    if (node.classList.contains('bf-page')) {
      const idx = Array.from(node.parentElement?.children ?? []).indexOf(node) + 1
      label = `宣传册 · 第 ${idx} 页`
    } else if (node.classList.contains('bf-poster')) label = '主视觉海报'
    else if (node.classList.contains('bf-sq')) label = '社媒方图 · 1080×1080'
    else if (node.classList.contains('bf-vt')) label = '社媒竖图 · 1080×1440'
    else if (node.classList.contains('bf-bn')) label = '社媒横图 · 1920×1080'
    else if (node.classList.contains('bf-sheet')) label = '品牌视觉规范'
    setZoomMode('fit')
    setZoom({ html: node.outerHTML, w: node.offsetWidth, h: node.offsetHeight, label })
  }

  const fitScale = zoom
    ? Math.min((window.innerWidth - 160) / zoom.w, (window.innerHeight - 160) / zoom.h, 1)
    : 1
  const zoomScale = zoomMode === 'fit' ? fitScale : zoomMode

  // ── 框选编辑 ─────────────────────────────
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const rectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null)
  const [pop, setPop] = useState<{ x: number; y: number; text: string } | null>(null)
  const [instruction, setInstruction] = useState('')
  const dragStart = useRef<{ x: number; y: number } | null>(null)

  // 退出框选模式时清空选框与弹窗
  useEffect(() => {
    if (!editMode) {
      rectRef.current = null
      dragStart.current = null
      setRect(null)
      setPop(null)
      setInstruction('')
    }
  }, [editMode])

  const onPointerDown = (e: React.PointerEvent) => {
    if (!editMode || !bodyRef.current) return
    const base = bodyRef.current.getBoundingClientRect()
    dragStart.current = {
      x: e.clientX - base.left + bodyRef.current.scrollLeft,
      y: e.clientY - base.top + bodyRef.current.scrollTop,
    }
    setPop(null)
    rectRef.current = null
    setRect(null)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!editMode || !dragStart.current || !bodyRef.current) return
    const base = bodyRef.current.getBoundingClientRect()
    const cx = e.clientX - base.left + bodyRef.current.scrollLeft
    const cy = e.clientY - base.top + bodyRef.current.scrollTop
    const s = dragStart.current
    const r = { x: Math.min(s.x, cx), y: Math.min(s.y, cy), w: Math.abs(cx - s.x), h: Math.abs(cy - s.y) }
    rectRef.current = r
    setRect(r)
  }
  const onPointerUp = () => {
    const cur = rectRef.current
    if (!editMode || !dragStart.current || !cur || !bodyRef.current) {
      dragStart.current = null
      return
    }
    dragStart.current = null
    if (cur.w < 24 || cur.h < 18) {
      rectRef.current = null
      setRect(null)
      return
    }
    // 采样框内叶子元素文字，告诉 LLM 用户选中的是什么
    const base = bodyRef.current.getBoundingClientRect()
    const texts = new Set<string>()
    for (let gx = 0.15; gx <= 0.85; gx += 0.35) {
      for (let gy = 0.15; gy <= 0.85; gy += 0.35) {
        const px = base.left - bodyRef.current.scrollLeft + cur.x + cur.w * gx
        const py = base.top - bodyRef.current.scrollTop + cur.y + cur.h * gy
        for (const el of document.elementsFromPoint(px, py)) {
          if (el instanceof HTMLElement && el.children.length === 0) {
            const t = el.textContent?.trim()
            if (t && t.length < 60) texts.add(t)
          }
        }
      }
    }
    setPop({
      x: Math.max(8, Math.min(cur.x, bodyRef.current.scrollWidth - 380)),
      y: cur.y + cur.h + 8,
      text: [...texts].slice(0, 4).join(' / '),
    })
  }

  const submitEdit = async () => {
    if (!pop || !instruction.trim()) return
    await onEditSubmit(instruction.trim(), pop.text)
    setInstruction('')
    setPop(null)
    setRect(null)
  }

  // ── 导出 ─────────────────────────────
  const doExport = async () => {
    if (tab === 'brochure' && brochureRef.current) {
      const pages = Array.from(brochureRef.current.querySelectorAll<HTMLElement>('.bf-page'))
      exportPdf(pages, brand, templatesCss)
    } else if (tab === 'poster' && posterRef.current) {
      const node = posterRef.current.querySelector<HTMLElement>('.bf-poster')
      if (node) await exportPng(node, `${brand.brandName}-主视觉海报-800x1200.png`)
    } else if (tab === 'social' && socialRef.current) {
      const n = await exportTagged(socialRef.current)
      if (n === 0) console.warn('未找到可导出节点')
    }
  }

  // ── 缩放比例 ─────────────────────────────
  const brochureScale = Math.min(0.62, Math.max(0.16, (bodySize.h - 8) / BROCHURE_H), Math.max(0.16, (bodySize.w - 8) / BROCHURE_W))
  const posterScale = Math.min(0.66, Math.max(0.2, (bodySize.h - 8) / 1200))
  const sqScale = Math.min(0.34, Math.max(0.14, (bodySize.h - 160) / 1440))
  const vtScale = Math.min(0.34, Math.max(0.14, (bodySize.h - 120) / 1440))
  const bnScale = Math.min(0.46, Math.max(0.14, (bodySize.w - 8) / 1920), Math.max(0.14, (bodySize.h * 0.42) / 1080))
  const sheetScale = Math.min(1, Math.max(0.3, (bodySize.w - 8) / 900))

  const exportLabel =
    tab === 'brochure' ? '导出 PDF' : tab === 'poster' ? '导出 PNG' : tab === 'social' ? '导出全部 PNG' : ''

  return (
    <main className="stage">
      <div className="stage-tabs">
        {(
          [
            ['brand', '品牌系统'],
            ['brochure', '宣传册'],
            ['poster', '主视觉海报'],
            ['social', '社媒套图'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} className={`stage-tab ${tab === id ? 'active' : ''}`} onClick={() => onTab(id)}>
            {label}
          </button>
        ))}
        <div className="stage-actions">
          <span className="stage-hint">{editMode ? '拖拽框选物料区域 → 自然语言修改' : ''}</span>
          <button className={`btn btn-sm ${editMode ? 'btn-danger' : ''}`} onClick={onToggleEdit}>
            {editMode ? '✕ 退出框选' : '✂ 框选编辑'}
          </button>
          {exportLabel && (
            <button className="btn btn-sm btn-primary" onClick={doExport}>
              {exportLabel}
            </button>
          )}
        </div>
      </div>

      <div
        ref={bodyRef}
        className={`stage-body ${editMode ? 'editing' : ''}`}
        onClick={openZoom}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {tab === 'brand' && (
          <ScaleFrame w={900} h={780} scale={sheetScale}>
            <BrandSheet brand={brand} copy={copy} />
          </ScaleFrame>
        )}

        {tab === 'brochure' && (
          <div ref={brochureRef}>
            <ScaleFrame w={BROCHURE_W} h={BROCHURE_H} scale={brochureScale}>
              <div style={{ width: BROCHURE_W }}>
                <Brochure brand={brand} copy={copy} heroUrl={heroUrl} />
              </div>
            </ScaleFrame>
          </div>
        )}

        {tab === 'poster' && (
          <div ref={posterRef}>
            <ScaleFrame w={800} h={1200} scale={posterScale}>
              <Poster brand={brand} copy={copy} heroUrl={heroUrl} />
            </ScaleFrame>
          </div>
        )}

        {tab === 'social' && (
          <div ref={socialRef} className="social-scaled">
            <div className="social-col">
              <ScaleFrame w={1080} h={1080} scale={sqScale}>
                <QuoteCard brand={brand} copy={copy} heroUrl={heroUrl} />
              </ScaleFrame>
              <p className="bf-social-caption">{copy.socialCaptions[0]?.body ?? ''}</p>
            </div>
            <div className="social-col">
              <ScaleFrame w={1080} h={1440} scale={vtScale}>
                <ProgramCard brand={brand} copy={copy} heroUrl={heroUrl} />
              </ScaleFrame>
              <p className="bf-social-caption">{copy.socialCaptions[1]?.body ?? ''}</p>
            </div>
            <div className="social-col social-col-wide">
              <ScaleFrame w={1920} h={1080} scale={bnScale}>
                <BannerCard brand={brand} copy={copy} heroUrl={heroUrl} />
              </ScaleFrame>
              <p className="bf-social-caption">{copy.socialCaptions[2]?.body ?? ''}</p>
            </div>
          </div>
        )}

        {/* 框选编辑 UI */}
        {rect && <div className="edit-rect" style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }} />}
        {pop && (
          <div className="edit-pop" style={{ left: pop.x, top: pop.y }} onPointerDown={(e) => e.stopPropagation()}>
            <label>自然语言修改 · 全局品牌规则同步更新</label>
            {pop.text && <div className="edit-selected">已选中：{pop.text}</div>}
            <textarea
              rows={2}
              autoFocus
              placeholder='例如："标题换成更轻的字重，主色向深绿偏移一档"'
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submitEdit()
                }
              }}
            />
            <div className="edit-pop-actions">
              <button
                className="btn btn-sm"
                onClick={() => {
                  setPop(null)
                  setRect(null)
                }}
              >
                取消
              </button>
              <button className="btn btn-sm btn-primary" onClick={submitEdit} disabled={editing || !instruction.trim()}>
                {editing ? '解析中…' : '应用修改 ⏎'}
              </button>
            </div>
          </div>
        )}
        {/* 点击放大 Lightbox */}
        {zoom && (
          <div
            className="lightbox-mask"
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) setZoom(null)
            }}
          >
            <div className="lightbox-bar" onPointerDown={(e) => e.stopPropagation()}>
              <span className="lightbox-label">{zoom.label}</span>
              <span className="lightbox-hint">
                {zoom.w}×{zoom.h}px · 滚轮区域可拖动滚动 · ESC 关闭
              </span>
              <div className="lightbox-actions">
                <button className={`btn btn-sm ${zoomMode === 'fit' ? 'btn-primary' : ''}`} onClick={() => setZoomMode('fit')}>
                  适应屏幕
                </button>
                <button className={`btn btn-sm ${zoomMode === 1 ? 'btn-primary' : ''}`} onClick={() => setZoomMode(1)}>
                  原始尺寸
                </button>
                <button className={`btn btn-sm ${zoomMode === 1.5 ? 'btn-primary' : ''}`} onClick={() => setZoomMode(1.5)}>
                  150%
                </button>
                <button className="btn btn-sm" onClick={() => setZoom(null)}>
                  ✕
                </button>
              </div>
            </div>
            <div className="lightbox-scroll">
              <div className="bf-frame" style={{ width: zoom.w * zoomScale, height: zoom.h * zoomScale }}>
                <div
                  style={{ width: zoom.w, height: zoom.h, transform: `scale(${zoomScale})`, transformOrigin: 'top left' }}
                  dangerouslySetInnerHTML={{ __html: zoom.html }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

/** 品牌规范页：把 brand.json 渲染成可交付的规范单页 */
function BrandSheet({ brand, copy }: { brand: BrandSystem; copy: GenResult['copy'] }) {
  return (
    <div className="bf-sheet">
      <div className="bf-sheet-head">
        <LogoMark size={52} brand={brand} />
        <h2>
          {brand.brandName} 品牌视觉规范
          <span style={{ fontSize: 14, color: 'var(--brand-muted)', marginLeft: 14, fontFamily: 'var(--mono)' }}>
            {brand.brandNameEn}
          </span>
        </h2>
        <span className="tag">Brand Guidelines · Auto-Generated</span>
      </div>
      <div className="bf-sheet-grid">
        <div className="bf-sheet-sec">
          <h3>Color Palette</h3>
          <div className="bf-sheet-colors">
            {(Object.keys(brand.colors) as (keyof BrandSystem['colors'])[]).map((k) => (
              <div className="bf-sheet-color" key={k}>
                <div className="box" style={{ background: brand.colors[k] }} />
                <div className="k">{k}</div>
                <div className="v">{brand.colors[k].toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bf-sheet-sec bf-sheet-type">
          <h3>Typography</h3>
          <div className="line">
            <div className="role">DISPLAY · {brand.fonts.display} · W{brand.fonts.displayWeight}</div>
            <div className="display-spec">{brand.brandName} · {copy.pillars[0]?.title ?? '声景城市'}</div>
          </div>
          <div className="line">
            <div className="role">BODY · {brand.fonts.body}</div>
            <div className="body-spec">
              {copy.manifesto[1] ?? '好的内容值得被打印出来。'} The quick brown fox jumps over the lazy dog.
            </div>
          </div>
        </div>
        <div className="bf-sheet-sec bf-sheet-slogan">
          <h3>Slogan</h3>
          <div className="zh">{brand.slogan.zh}</div>
          <div className="en">{brand.slogan.en}</div>
          <div style={{ marginTop: 18 }}>
            <MotifDecor width={300} height={20} color={brand.colors.accent} brand={brand} />
          </div>
        </div>
        <div className="bf-sheet-sec">
          <h3>Tone of Voice</h3>
          <div className="bf-sheet-chips">
            {brand.tone.map((t, i) => (
              <span key={i}>{t}</span>
            ))}
          </div>
        </div>
        <div className="bf-sheet-motifs">
          <div>
            <h3
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: '0.24em',
                color: 'var(--brand-muted)',
                marginBottom: 10,
              }}
            >
              VISUAL MOTIFS
            </h3>
            <div className="list">
              {brand.motifs.map((m, i) => (
                <div key={i}>· {m}</div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <MotifDecor width={520} height={40} color={brand.colors.primary} brand={brand} />
          </div>
        </div>
      </div>
    </div>
  )
}
