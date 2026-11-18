import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applySavedFont } from './lib/font'
import { listenInstall, registerServiceWorker } from './lib/install'
import { applySavedTheme } from './lib/theme'

applySavedTheme()
applySavedFont()
listenInstall()
registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
)
