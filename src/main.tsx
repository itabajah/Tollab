import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/pacifico/index.css'
import '@/styles/theme.css'
import { createSession } from '@/store/session'
import { Providers } from '@/features/app/Providers'
import App from '@/App'

const session = createSession({
  storage: localStorage,
  onSaveError: (error) => console.error('[Tollab] Failed to save data', error),
})

// Apply the persisted theme before first paint to avoid a flash of wrong theme.
document.documentElement.dataset.theme = session.appStore.getState().data.settings.theme

// Never lose the debounce window on tab close / reload.
window.addEventListener('beforeunload', () => session.flush())
document.addEventListener('visibilitychange', () => {
  if (document.hidden) session.flush()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers session={session}>
      <App />
    </Providers>
  </StrictMode>,
)
