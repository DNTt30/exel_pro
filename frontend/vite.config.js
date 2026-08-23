import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.VITE_BASE_PATH || '/',
  // Test chạy 1 worker: bộ test chỉ mất ~4s nhưng tránh OOM trên máy ít RAM trống
  test: {
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
})
