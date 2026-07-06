import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/pacifico/index.css'
import '@/styles/theme.css'
import { createSession } from '@/store/session'
import { createSyncController, type SyncController } from '@/store/syncController'
import { ensureClientId } from '@/services/storage/localStore'
import { getFirebaseApp } from '@/services/firebase/app'
import { createFirebaseAuth } from '@/services/firebase/auth'
import { createFirebaseBackend } from '@/services/sync/firebaseBackend'
import { Providers } from '@/features/app/Providers'
import { notifySaveError } from '@/features/app/saveError'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import App from '@/App'

const storage = localStorage

// The sync controller is created after the session (it needs it), so the
// session's onDirty forwards through a mutable reference.
let syncController: SyncController | null = null

const session = createSession({
  storage,
  onDirty: () => syncController?.notifyLocalChange(),
  onSaveError: (error) => {
    console.error('[Tollab] Failed to save data', error)
    notifySaveError()
  },
})

// Cloud sync is optional: only wired when a Firebase config was built in.
const firebaseApp = getFirebaseApp()
if (firebaseApp) {
  syncController = createSyncController({
    session,
    storage,
    clientId: ensureClientId(storage),
    auth: createFirebaseAuth(firebaseApp),
    createBackend: (uid) => createFirebaseBackend(firebaseApp, uid),
  })
}

// Apply the persisted theme before first paint to avoid a flash of wrong theme.
document.documentElement.dataset.theme = session.appStore.getState().data.settings.theme

// Never lose the debounce window on tab close / reload.
const flushAll = () => {
  session.flush()
  void syncController?.flush()
}
window.addEventListener('beforeunload', flushAll)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) flushAll()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Providers session={session} syncController={syncController}>
        <App />
      </Providers>
    </ErrorBoundary>
  </StrictMode>,
)
