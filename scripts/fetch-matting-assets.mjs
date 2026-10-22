/**
 * 构建期一次性抓取 @imgly/background-removal 运行时资源（ISNet small 模型 + ort wasm）到 assets/matting/
 * 原理：用自定义 fetch 截获 preload() 的全部资源请求，按 URL 公共前缀剥离后落盘，
 * 使渲染进程以 publicPath = 'bf-res://matting/' 离线命中相同相对路径。
 * 用法：npm run matting:assets（发版前执行一次；assets/matting 不进 git）
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const outDir = path.resolve('assets/matting')
const hits = [] // { url, buf }

// 先保存原始 fetch 引用，teeFetch 内部必须用它（否则递归自调）
const origFetch = globalThis.fetch
const teeFetch = async (url, init) => {
  const res = await origFetch(url, init)
  const buf = Buffer.from(await res.arrayBuffer())
  hits.push({ url: String(url), buf })
  return new Response(buf, { status: res.status, headers: res.headers })
}

const mod = await import('@imgly/background-removal')
const preload = mod.preload ?? mod.default?.preload
if (!preload) throw new Error('未找到 preload 导出，请检查 @imgly/background-removal 版本')

// 该库无 fetch 注入配置（Config 只有 publicPath/fetchArgs）→ 直接接管全局 fetch
globalThis.fetch = teeFetch
// 浏览器版库在 Node 里创建推理会话会失败（blob: URL），但失败前资源已全部经 teeFetch 截获——这正是我们要的
try {
  await preload({ model: 'small' })
} catch (e) {
  console.log(`（预期内）会话初始化跳过：${String(e).slice(0, 80)}…`)
} finally {
  globalThis.fetch = origFetch
}
if (!hits.length) throw new Error('未截获任何资源请求')

// 公共前缀（到最后一个 /），剥离后作为相对路径落盘
const prefix = hits
  .map((h) => h.url)
  .reduce((a, b) => {
    let i = 0
    while (i < a.length && a[i] === b[i]) i++
    return a.slice(0, i)
  })
const root = prefix.slice(0, prefix.lastIndexOf('/') + 1)
console.log(`资源根：${root}`)

for (const h of hits) {
  const rel = h.url.startsWith(root) ? h.url.slice(root.length) : h.url.replace(/^https?:\/\//, '')
  const dest = path.join(outDir, rel)
  await mkdir(path.dirname(dest), { recursive: true })
  await writeFile(dest, h.buf)
  console.log(`✓ ${rel} (${(h.buf.length / 1024 / 1024).toFixed(1)}MB)`)
}
console.log(`完成：${hits.length} 个文件 → ${outDir}`)
