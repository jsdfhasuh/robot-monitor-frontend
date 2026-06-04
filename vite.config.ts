import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_BACKEND_URL || process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'
  const backendWs = env.VITE_BACKEND_WS || process.env.VITE_BACKEND_WS || 'ws://127.0.0.1:8000'

  return {
    plugins: [vue()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false
        },
        '/stream': {
          target: backendUrl,
          changeOrigin: true,
          secure: false
        },
        '/data': {
          target: backendUrl,
          changeOrigin: true,
          secure: false
        },
        '/ws': {
          target: backendWs,
          ws: true,
          secure: false
        }
      }
    }
  }
})
