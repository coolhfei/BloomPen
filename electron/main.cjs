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

// Windows 息屏/后台恢复黑屏修复（分层）：
// 1. 命令行开关：禁止后台节流/遮挡检测
// 2. backgroundThrottling: false：渲染进程不降频
// 3. aggressiveRepaint：resize hack 强制重建 GPU 表面（invalidate 不够深）
// 4. powerMonitor：监听系统唤醒/解锁（比 window focus 更可靠）
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion')

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

  // 息屏/后台恢复黑屏修复：resize hack 强制 GPU 重建表面 + 电源事件监听
  const aggressiveRepaint = () => {
    try {
      // ① 标脏帧（浅层修复，部分场景够用）
      win.webContents.invalidate()

      // ② resize hack：改 1px 强制 OS 重新分配窗口像素缓冲 → 合成器重建 GPU 表面
      const bounds = win.getBounds()
      win.setBounds({ ...bounds, height: bounds.height + 1 })
      setTimeout(() => {
        try {
          win.setBounds(bounds)
          win.webContents.invalidate()
        } catch { /* closing */ }
      }, 50)

      // ③ CSS 层强制重排（触发 Chromium 重新走一遍渲染管线）
      setTimeout(() => {
        try {
          win.webContents.executeJavaScript(
            'document.documentElement.style.transform="translateZ(0)";' +
            'setTimeout(()=>document.documentElement.style.transform="",100);'
          ).catch(() => {})
          win.webContents.invalidate()
        } catch { /* closing */ }
      }, 200)
    } catch { /* closing */ }
  }

  // 窗口事件
  win.on('show', aggressiveRepaint)
  win.on('restore', aggressiveRepaint)
  win.on('focus', aggressiveRepaint)

  // 电源事件（比 window focus 更可靠：系统唤醒/解锁时必然触发）
  powerMonitor.on('resume', aggressiveRepaint)
  powerMonitor.on('unlock-screen', aggressiveRepaint)
  powerMonitor.on('lock-screen', () => {
    // 锁屏时提前标脏，回来时 Chromium 已有排队帧
    try { win.webContents.invalidate() } catch { /* closing */ }
  })

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
