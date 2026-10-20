import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './global.css'
import './components/templates.css'
// 字体自托管（SIL OFL，见 FONTS.md）
import '@fontsource-variable/noto-serif-sc'
import '@fontsource-variable/noto-sans-sc'
import '@fontsource/zcool-xiaowei'
import '@fontsource/zcool-qingke-huangyou'
import '@fontsource/ma-shan-zheng'
import '@fontsource/long-cang'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
