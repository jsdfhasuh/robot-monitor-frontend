import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/ws': {
        target: process.env.VITE_BACKEND_WS || 'ws://127.0.0.1:8000',
        ws: true
      }
    }
  }
})
