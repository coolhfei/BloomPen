import type { BrandSystem } from '../lib/types'
import { useEffect, useRef, useState } from 'react'

const COLOR_KEYS: [keyof BrandSystem['colors'], string][] = [
  ['primary', '主色'],
  ['secondary', '辅色'],
  ['accent', '点缀'],
  ['ink', '墨色'],
  ['paper', '纸色'],
  ['muted', '弱化'],
]

/** 右侧 brand.json 实时检视器：token 一变就闪 */
export function TokenInspector({ brand, version }: { brand: BrandSystem; version: number }) {
  const [showJson, setShowJson] = useState(false)
  const [flash, setFlash] = useState(false)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    setFlash(true)
    const t = setTimeout(() => setFlash(false), 1000)
    return () => clearTimeout(t)
  }, [version])

  return (
    <aside className="inspector">
      <div className="inspector-title">
        <span>brand.json</span>
        <span className="live">LIVE</span>
      </div>

      <div className={`insp-sec ${flash ? 'insp-flash' : ''}`}>
        <h4>Colors · 色彩系统</h4>
        <div className="swatch-row">
          {COLOR_KEYS.map(([k, label]) => (
            <div
              className="swatch"
              key={k}
              title={`点击复制 ${brand.colors[k]}`}
              onClick={() => navigator.clipboard?.writeText(brand.colors[k])}
            >
              <div className="swatch-color" style={{ background: brand.colors[k] }} />
              <div className="swatch-meta">
                <div className="k">{label} {k}</div>
                <div className="v">{brand.colors[k].toUpperCase()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`insp-sec ${flash ? 'insp-flash' : ''}`}>
        <h4>Typography · 字体</h4>
        <div className="font-row">
          <div className="role">DISPLAY · {brand.fonts.display} · {brand.fonts.displayWeight}</div>
          <div className="spec" style={{ fontFamily: `"${brand.fonts.display}", serif`, fontWeight: brand.fonts.displayWeight }}>
            {brand.brandName} Aa
          </div>
        </div>
        <div className="font-row">
          <div className="role">BODY · {brand.fonts.body}</div>
          <div className="spec" style={{ fontFamily: `"${brand.fonts.body}", sans-serif`, fontSize: 15 }}>
            城市的声音，值得被认真听见。
          </div>
        </div>
      </div>

      <div className={`insp-sec ${flash ? 'insp-flash' : ''}`}>
        <h4>Slogan · 口号</h4>
        <div className="slogan-block">
          <div className="zh">{brand.slogan.zh}</div>
          <div className="en">{brand.slogan.en}</div>
        </div>
      </div>

      <div className="insp-sec">
        <h4>Tone · 语气</h4>
        <div className="chips">
          {brand.tone.map((t, i) => (
            <span className="chip accent" key={i}>{t}</span>
          ))}
        </div>
      </div>

      <div className="insp-sec">
        <h4>Motifs · 视觉母题</h4>
        <div className="chips">
          {brand.motifs.map((m, i) => (
            <span className="chip" key={i}>{m}</span>
          ))}
        </div>
      </div>

      <div className="insp-sec">
        <button className="json-toggle" onClick={() => setShowJson((v) => !v)}>
          {showJson ? '▾ 收起源文件' : '▸ 查看 brand.json 源文件'}
        </button>
        {showJson && <pre className="json-view">{JSON.stringify(brand, null, 2)}</pre>}
      </div>
    </aside>
  )
}
