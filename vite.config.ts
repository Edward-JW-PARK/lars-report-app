import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    proxy: {
      // /api/* 요청을 Express API 서버(포트 3099)로 프록시
      '/api': {
        target: 'http://localhost:3099',
        changeOrigin: true,
        secure: false,
      }
    }
  },
});
