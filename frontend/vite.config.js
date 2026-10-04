import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    base: env.VITE_BASE_PATH || process.env.VITE_BASE_PATH || (mode === 'production' ? '/exel_pro/' : '/'),
    // Test chạy 1 worker: bộ test chỉ mất ~4s nhưng tránh OOM trên máy ít RAM trống
    test: {
      pool: 'forks',
      maxWorkers: 1,
    },
  }
})
