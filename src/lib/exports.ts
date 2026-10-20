import { toPng } from 'html-to-image'
import { brandToVars } from './tokens'
import { FONTS_CSS } from './fonts'
import { isDesktop } from './providers/transport'
import type { BrandSystem } from './types'

/**
 * 导出 PNG：以节点布局尺寸 1:1 导出，克隆时移除屏幕展示用的缩放与阴影。
 */
export async function exportPng(node: HTMLElement, filename: string): Promise<void> {
  const dataUrl = await toPng(node, {
    pixelRatio: 1,
    width: node.offsetWidth,
    height: node.offsetHeight,
    cacheBust: true,
    style: { transform: 'none', boxShadow: 'none', margin: '0' },
    backgroundColor: getComputedStyle(node).backgroundColor || '#ffffff',
  })
  download(dataUrl, filename)
}

/** 批量导出：扫描容器内所有 [data-export] 节点，按标记的文件名逐张导出 */
export async function exportTagged(container: HTMLElement): Promise<number> {
  const nodes = Array.from(container.querySelectorAll<HTMLElement>('[data-export]'))
  for (const node of nodes) {
    await exportPng(node, node.dataset.export ?? 'export.png')
    await new Promise((r) => setTimeout(r, 400))
  }
  return nodes.length
}

/**
 * 导出宣传册 PDF（保留真实文字层）：
 * - 桌面端：主进程隐藏窗口 printToPDF（preferCSSPageSize，@page A4 生效），弹保存对话框；
 * - Web 端：隐藏 iframe + 浏览器打印对话框（用户选"另存为 PDF"）。
 * 页面按 96dpi 设计（794×1123px ≈ A4），字体为自托管 @font-face，注入独立文档。
 */
export async function exportPdf(pages: HTMLElement[], brand: BrandSystem, extraCss: string): Promise<void> {
  const html = buildPrintHtml(pages, brand, extraCss)
  if (isDesktop()) {
    await window.bfBridge!.pdfFromHtml(html, `${brand.brandName}-宣传册.pdf`)
    return
  }
  printViaIframe(html)
}

function buildPrintHtml(pages: HTMLElement[], brand: BrandSystem, extraCss: string): string {
  const varCss = Object.entries(brandToVars(brand))
    .map(([k, v]) => `${k}:${v};`)
    .join('')
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<style>
${FONTS_CSS}
</style>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { background:#fff; }
  :root { ${varCss} }
  @page { size: A4; margin: 0; }
  .bf-page { page-break-after: always; break-after: page; box-shadow:none !important; }
  .bf-page:last-child { page-break-after: avoid; break-after: avoid; }
  ${extraCss}
</style>
</head>
<body>
${pages.map((p) => p.outerHTML).join('\n')}
</body>
</html>`
}

function printViaIframe(html: string): void {
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;height:600px;border:0;'
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument
  if (!doc) return
  doc.open()
  doc.write(html)
  doc.close()

  let printed = false
  const doPrint = () => {
    if (printed || !iframe.isConnected) return
    printed = true
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    setTimeout(() => iframe.remove(), 60_000)
  }
  const fontsReady = (doc as Document & { fonts?: FontFaceSet }).fonts?.ready
  if (fontsReady) fontsReady.then(() => setTimeout(doPrint, 400))
  else setTimeout(doPrint, 1200)
  setTimeout(doPrint, 6000)
}

function download(dataUrl: string, filename: string): void {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}
