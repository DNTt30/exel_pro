import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { lazy, Suspense } from 'react'
import { registerServiceWorker } from './utils/pwaHelper'

const App = import.meta.env.DEV && import.meta.env.MODE === 'agent-sandbox'
  ? lazy(() => import('./sandbox/AgentSandbox.jsx')) : lazy(() => import('./App.jsx'));
if (!(import.meta.env.DEV && import.meta.env.MODE === 'agent-sandbox')) registerServiceWorker();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={<p role="status">Đang tải ứng dụng…</p>}><App /></Suspense>
  </StrictMode>,
)
