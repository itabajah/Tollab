import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/pacifico/index.css'
import '@/styles/theme.css'
import { applyTheme, getStoredTheme } from '@/hooks/useTheme'
import App from '@/App'

// Apply the persisted theme before first paint to avoid a flash of wrong theme.
applyTheme(getStoredTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
