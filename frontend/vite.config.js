import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // 所有 /api 请求转发到后端springboot
      '/api': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
      }
    }
  }
})
