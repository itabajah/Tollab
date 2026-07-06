import { useEffect, type ReactNode } from 'react'
import { SessionProvider, useAppState } from '@/hooks/session'
import { SyncProvider } from '@/hooks/syncContext'
import { NowProvider } from '@/hooks/useNow'
import { ToastProvider } from '@/components/ui/Toast'
import { ConfirmProvider } from '@/components/ui/ConfirmProvider'
import { CourseDialogProvider } from '@/features/courses/CourseDialogProvider'
import { SaveErrorWatcher } from './SaveErrorWatcher'
import type { Session } from '@/store/session'
import type { SyncController } from '@/store/syncController'

/** Keeps the document theme attribute in sync with the active profile's settings. */
function ThemeSync() {
  const theme = useAppState((s) => s.data.settings.theme)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  return null
}

export function Providers({
  session,
  syncController = null,
  children,
}: {
  session: Session
  syncController?: SyncController | null
  children: ReactNode
}) {
  return (
    <SessionProvider session={session}>
      <SyncProvider controller={syncController}>
        <NowProvider>
          <ToastProvider>
            <ConfirmProvider>
              <ThemeSync />
              <SaveErrorWatcher />
              <CourseDialogProvider>{children}</CourseDialogProvider>
            </ConfirmProvider>
          </ToastProvider>
        </NowProvider>
      </SyncProvider>
    </SessionProvider>
  )
}
