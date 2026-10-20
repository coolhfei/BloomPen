const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('bfBridge', {
  isDesktop: true,
  request: (req) => ipcRenderer.invoke('http:request', req),
  pdfFromHtml: (html, defaultName) => ipcRenderer.invoke('pdf:fromHtml', html, defaultName),
})
