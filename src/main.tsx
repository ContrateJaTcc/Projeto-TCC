import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { aplicarPreferencias, vigiarHorario, vigiarSistema } from './utils/preferencias'
import { vigiarCenarioGlobal } from './utils/cenarioglobal'
import { instalarMonitor } from './utils/monitor'

aplicarPreferencias()
vigiarHorario()
vigiarSistema()
vigiarCenarioGlobal()
instalarMonitor()

/* App instalável e que abre sem internet (public/sw.js); só no site publicado, para não atrapalhar o npm run dev */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
