import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const mlBackendTarget =
    env.VITE_ML_API_TARGET ||
    process.env.VITE_ML_API_TARGET ||
    env.ML_API_TARGET ||
    process.env.ML_API_TARGET ||
    env.VITE_ML_API_URL ||
    process.env.VITE_ML_API_URL ||
    'http://localhost:8000'

  return {
    plugins: [react(), tailwindcss()],
    base: env.VITE_BASE_PATH || process.env.VITE_BASE_PATH || (mode === 'production' ? '/exel_pro/' : '/'),
    server: {
      proxy: {
        '/api/ml': {
          target: mlBackendTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/ml/, '') || '/',
        },
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react-router-dom',
        'zustand',
        'zustand/react/shallow',
        'lucide-react',
        '@supabase/supabase-js',
        'zod',
      ],
      exclude: ['xlsx'],
    },
    // Test chạy 1 worker: bộ test chỉ mất ~4s nhưng tránh OOM trên máy ít RAM trống
    test: {
      pool: 'forks',
      maxWorkers: 1,
    },
  }
})
