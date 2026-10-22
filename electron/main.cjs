/**
 * BrandForge 桌面壳（Electron 主进程）。
 * 职责：窗口、IPC 传输桥（Node fetch，消灭 CORS）、隐藏窗口 printToPDF。
 * 渲染进程零 Node 权限（contextIsolation + sandbox），所有网络/文件能力经 IPC 白名单暴露。
 */
const { app, BrowserWindow, ipcMain, dialog, powerMonitor } = require('electron')
const path = require('path')
const fs = require('fs')
const { pathToFileURL } = require('url')

const DEV_URL = process.env.VITE_DEV_SERVER_URL || ''
const isDev = !!DEV_URL

// Windows 后台/息屏恢复黑屏终极修复：
// 所有软件层修复（invalidate/resize/重排）对长时间后台场景不够深，
// 根因是 GPU 合成器表面丢失后不可恢复。禁用硬件加速从根源消灭此问题。
// 本应用渲染内容为静态 HTML/CSS（无动画/无视频/无 WebGL），性能影响可忽略。
app.disableHardwareAcceleration()

/** 渲染进程目录（打包后为 resources/app/dist） */
function rendererDir() {
  return isDev ? null : path.join(__dirname, '..', 'dist')
}

/** 打印文档的 <base>：让内联 css 里的相对字体/资源路径可解析 */
function printBaseHref() {
  if (isDev) return DEV_URL.replace(/\/+$/, '') + '/'
  return pathToFileURL(rendererDir() + path.sep).href
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1560,
    height: 960,
    minWidth: 1180,
    minHeight: 720,
    backgroundColor: '#100e0c',
    title: 'BrandForge',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: false,
    },
  })
  if (isDev) {
    win.loadURL(DEV_URL)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(rendererDir(), 'index.html'))
  }

  // 黑屏修复（disableHardwareAcceleration 已根治，以下为轻量补充）
  const aggressiveRepaint = () => {
    try { win.webContents.invalidate() } catch { /* closing */ }
  }
  win.on('show', aggressiveRepaint)
  win.on('restore', aggressiveRepaint)
  win.on('focus', aggressiveRepaint)
  powerMonitor.on('resume', aggressiveRepaint)
  powerMonitor.on('unlock-screen', aggressiveRepaint)

  return win
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── IPC：通用 HTTP 桥（模型/图片字节请求统一走这里，无 CORS） ──
ipcMain.handle('http:request', async (_e, req) => {
  const { url, method = 'GET', headers, body, bodyBase64, responseType = 'text', timeoutMs = 120000 } = req ?? {}
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
    return { status: 400, body: '非法请求地址' }
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: bodyBase64 ? Buffer.from(body ?? '', 'base64') : body,
      signal: controller.signal,
    })
    if (responseType === 'base64') {
      const buf = Buffer.from(await res.arrayBuffer())
      return { status: res.status, body: buf.toString('base64') }
    }
    return { status: res.status, body: await res.text() }
  } catch (e) {
    return { status: 0, body: String(e?.message ?? e) }
  } finally {
    clearTimeout(timer)
  }
})

// ── IPC：HTML → PDF（隐藏窗口 printToPDF，保留文字层，@page A4 生效） ──
ipcMain.handle('pdf:fromHtml', async (e, html, defaultName) => {
  const tmpDir = isDev ? rendererDir() ?? app.getPath('temp') : app.getPath('temp')
  const tmpFile = path.join(tmpDir, `bf-print-${Date.now()}.html`)
  const withBase = String(html).replace('<head>', `<head><base href="${printBaseHref()}">`)
  fs.writeFileSync(tmpFile, withBase, 'utf8')

  const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true } })
  try {
    await win.loadFile(tmpFile)
    await win.webContents.executeJavaScript('document.fonts ? document.fonts.ready.then(() => true) : true')
    const data = await win.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      margins: { marginType: 'none' },
    })
    const sender = BrowserWindow.fromWebContents(e.sender)
    const { canceled, filePath } = await dialog.showSaveDialog(sender, {
      defaultPath: path.join(app.getPath('downloads'), defaultName || 'brandforge.pdf'),
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    })
    if (canceled || !filePath) return null
    fs.writeFileSync(filePath, data)
    return filePath
  } finally {
    win.destroy()
    try {
      fs.unlinkSync(tmpFile)
    } catch {}
  }
})
