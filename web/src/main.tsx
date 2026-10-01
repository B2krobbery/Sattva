import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { initTheme } from './lib/theme'
import { initPlatform } from './lib/platform'
import './index.css'

initTheme()
initPlatform()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
