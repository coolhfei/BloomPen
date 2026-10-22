import { useRef, useState } from 'react'
import { downscaleToDataUrl, fileToDataUrl, PRODUCT_IMAGE_MAX_BYTES, PRODUCT_IMAGE_TYPES } from '../lib/images'
import { ensureCutout } from '../lib/matting'
import type { ImageConfig } from '../lib/providers/types'
import type { ProductImage } from '../lib/types'

interface Props {
  products: ProductImage[]
  imageCfg: ImageConfig
  disabled?: boolean
  /** 函数式更新，避免异步回填时读到旧数组 */
  onChange: (fn: (cur: ProductImage[]) => ProductImage[]) => void
  onToast: (msg: string, err?: boolean) => void
}

const MAX_IMAGES = 4

/** 商品图集条：上传/设主图/删除/拖拽排序；上传后异步抠图，完成即回填 cutoutUrl（渐进增强） */
export function ProductStrip({ products, imageCfg, disabled, onChange, onToast }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set())

  const addFiles = async (files: FileList | null) => {
    if (!files) return
    const added: ProductImage[] = []
    let count = products.length
    for (const file of Array.from(files)) {
      if (count + added.length >= MAX_IMAGES) {
        onToast(`商品图最多 ${MAX_IMAGES} 张`, true)
        break
      }
      if (!PRODUCT_IMAGE_TYPES.includes(file.type)) {
        onToast(`仅支持 jpg/png/webp：${file.name}`, true)
        continue
      }
      if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
        onToast(`图片过大（>10MB）：${file.name}`, true)
        continue
      }
      try {
        const dataUrl = await downscaleToDataUrl(await fileToDataUrl(file))
        added.push({ id: crypto.randomUUID(), dataUrl, mime: file.type, cutoutUrl: null, isMain: count + added.length === 0 })
      } catch {
        onToast(`读取失败：${file.name}`, true)
      }
    }
    if (!added.length) return
    onChange((cur) => [...cur, ...added])
    for (const item of added) {
      setPending((s) => new Set(s).add(item.id))
      ensureCutout(item.dataUrl, item.mime, { imageCfg }).then((cut) => {
        setPending((s) => {
          const n = new Set(s)
          n.delete(item.id)
          return n
        })
        if (cut) onChange((cur) => cur.map((p) => (p.id === item.id ? { ...p, cutoutUrl: cut } : p)))
      })
    }
  }

  const remove = (id: string) =>
    onChange((cur) => {
      const next = cur.filter((p) => p.id !== id)
      if (next.length && !next.some((p) => p.isMain)) next[0] = { ...next[0], isMain: true }
      return next
    })

  const setMain = (id: string) => onChange((cur) => cur.map((p) => ({ ...p, isMain: p.id === id })))

  // 拖拽排序（顺序决定宣传册内页第 2、3 图位归属）
  const dragId = useRef<string | null>(null)
  const drop = (targetId: string) => {
    const src = dragId.current
    dragId.current = null
    if (!src || src === targetId) return
    onChange((cur) => {
      const from = cur.findIndex((p) => p.id === src)
      const to = cur.findIndex((p) => p.id === targetId)
      if (from < 0 || to < 0) return cur
      const next = [...cur]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  return (
    <div className="product-strip">
      <input
        ref={inputRef}
        type="file"
        accept={PRODUCT_IMAGE_TYPES.join(',')}
        multiple
        hidden
        onChange={(e) => {
          addFiles(e.target.files)
          e.target.value = ''
        }}
      />
      {products.map((p) => (
        <div
          key={p.id}
          className={`product-thumb ${p.isMain ? 'is-main' : ''}`}
          draggable={!disabled}
          onDragStart={() => (dragId.current = p.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => drop(p.id)}
          title="拖拽可排序（顺序决定宣传册内页配图）"
        >
          <img src={p.cutoutUrl ?? p.dataUrl} alt="商品图" />
          {pending.has(p.id) && <span className="product-strip-pending">抠图中…</span>}
          <div className="product-strip-ops">
            {!p.isMain && (
              <button title="设为主图" disabled={disabled} onClick={() => setMain(p.id)}>
                ★
              </button>
            )}
            {p.isMain && <span className="product-strip-main-badge">主图</span>}
            <button title="删除" disabled={disabled} onClick={() => remove(p.id)}>
              ✕
            </button>
          </div>
        </div>
      ))}
      {products.length < MAX_IMAGES && (
        <button className="product-strip-add" disabled={disabled} onClick={() => inputRef.current?.click()}>
          ＋ 商品图
        </button>
      )}
      {products.length === 0 && <span className="product-strip-hint">上传商品实拍图，物料将用真实商品而非 AI 想象（可选）</span>}
    </div>
  )
}
