import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './'：Electron file:// 加载与任意子路径自托管都需要相对资源路径。
// 模型密钥/端点全部由用户在设置页自配（存 localStorage），构建产物不含任何密钥。
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173 },
})
